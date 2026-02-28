import cv2
import mediapipe as mp
import numpy as np
from datetime import datetime
import time
import matplotlib.pyplot as plt
import joblib
import os
import sys

# Import Nutrition Calculator
_script_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.join(_script_dir, '..')
sys.path.insert(0, _project_root)
from utils.nutrition_calculator import NutritionCalculator

# Load ML model
try:
    models_dir = os.path.join(_project_root, 'models')
    body_classifier = joblib.load(os.path.join(models_dir, 'body_classifier.pkl'))
    scaler = joblib.load(os.path.join(models_dir, 'scaler.pkl'))
    label_encoder = joblib.load(os.path.join(models_dir, 'label_encoder.pkl'))
    nutrition_calc = NutritionCalculator()
except Exception as e:
    print(f'❌ Error loading model: {e}')
    print("Please make sure you have trained the model first.")
    exit()

mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

pose = mp_pose.Pose(
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7,
    smooth_landmarks=True
)

def get_user_info():
    print('='*70)
    print('LIVE BODY TRACKING SYSTEM')
    print('='*70)
    print('\nEnter your details:')
    
    # We use a simple try-except block here so it doesn't crash on invalid input
    try:
        height = float(input('Height (cm): '))
        weight = float(input('Weight (kg): '))
        age = int(input('Age: '))
        gender = input('Gender (male/female): ').lower()
    except ValueError:
        print("\nInvalid input, using defaults (170cm, 70kg, 25, male).")
        height, weight, age, gender = 170.0, 70.0, 25, 'male'
    
    print('\n✅ Starting live camera...')
    print('You will see yourself on screen!')
    print('Press Q to quit\n')
    time.sleep(2)
    
    return height, weight, age, gender

def calculate_pose_quality(landmarks, img_width):
    # Count visible landmarks
    visible = sum(1 for lm in landmarks if lm.visibility > 0.5)
    visibility_score = (visible / 33) * 100
    
    # Check shoulder width (distance check)
    left_shoulder = landmarks[11]
    right_shoulder = landmarks[12]
    shoulder_width = abs(left_shoulder.x - right_shoulder.x) * img_width
    
    if 120 < shoulder_width < 180:
        distance_score = 100
    else:
        distance_score = max(0, 100 - abs(shoulder_width - 150) * 2)
    
    # Overall quality
    quality = (visibility_score + distance_score) / 2
    
    return int(quality), visible

def extract_features(landmarks, img_width):
    '''Extract physical body features from MediaPipe landmarks'''
    left_shoulder = landmarks[11]
    right_shoulder = landmarks[12]
    left_hip = landmarks[23]
    right_hip = landmarks[24]
    nose = landmarks[0]
    left_ankle = landmarks[27]
    right_ankle = landmarks[28]
    
    # Measurements
    shoulder_width = abs(left_shoulder.x - right_shoulder.x)
    hip_width = max(abs(left_hip.x - right_hip.x), 1e-6)
    
    # Ratios (using basic approximations)
    waist_width = hip_width * 1.15
    waist_hip_ratio = waist_width / hip_width
    shoulder_waist_ratio = max(shoulder_width / waist_width, 1e-6)
    
    # Proportions
    ankle_mid_y = (left_ankle.y + right_ankle.y) / 2
    hip_mid_y = (left_hip.y + right_hip.y) / 2
    body_height = max(abs(nose.y - ankle_mid_y), 1e-6)
    torso_length = abs(nose.y - hip_mid_y)
    
    torso_leg_ratio = torso_length / body_height
    body_aspect_ratio = body_height / max(shoulder_width, 1e-6)
    
    return {
        'waist_hip_ratio': waist_hip_ratio,
        'shoulder_waist_ratio': shoulder_waist_ratio,
        'torso_leg_ratio': torso_leg_ratio,
        'body_aspect_ratio': body_aspect_ratio
    }

def classify_and_show_results(frame, landmarks, height_cm, weight_kg, age, gender):
    h, w = frame.shape[:2]
    body_features = extract_features(landmarks, w)
    
    # BMI calculation
    height_m = height_cm / 100
    bmi = weight_kg / (height_m ** 2)
    
    # ML Prediction
    gender_encoded = 1 if gender.lower() == 'male' else 0
    feature_vector = np.array([[
        bmi,
        body_features['waist_hip_ratio'],
        body_features['shoulder_waist_ratio'],
        body_features['torso_leg_ratio'],
        body_features['body_aspect_ratio'],
        age,
        gender_encoded
    ]])
    
    # Scale and predict
    feature_scaled = scaler.transform(feature_vector)
    prediction = body_classifier.predict(feature_scaled)[0]
    probabilities = body_classifier.predict_proba(feature_scaled)[0]
    
    category = label_encoder.inverse_transform([prediction])[0]
    confidence = probabilities[prediction]
    
    # Get Nutrition Plan
    nutrition = nutrition_calc.get_complete_nutrition_plan(
        weight_kg=weight_kg,
        height_cm=height_cm,
        age=age,
        gender=gender,
        category=category,
        activity_level='moderate'
    )
    targets = nutrition['daily_targets']
    
    print(f"\n=========================================")
    print(f"🎯 CLASSIFICATION RESULTS")
    print(f"=========================================")
    print(f'💪 BMI: {bmi:.1f}')
    print(f'🎯 CATEGORY: {category.upper().replace("_", " ")}')
    print(f'📊 Confidence: {confidence:.1%}')
    print(f'\n🍽️  DAILY NUTRITION TARGETS:')
    print(f'   Calories: {targets["calories"]} kcal')
    print(f'   Protein:  {targets["protein_g"]}g')
    print(f'   Carbs:    {targets["carbs_g"]}g')
    print(f'   Fats:     {targets["fats_g"]}g')
    print(f'   Water:    {targets["water_ml"]} ml')
    print(f"=========================================\n")
    return category

def draw_status_overlay(frame, quality, visible_landmarks, stage):
    h, w = frame.shape[:2]
    
    # Blue status box in top-left
    # OpenCV uses BGR coloring
    cv2.rectangle(frame, (10, 10), (290, 120), (255, 102, 0), -1)
    cv2.rectangle(frame, (10, 10), (290, 120), (255, 255, 255), 2)
    
    # POSE QUALITY text
    cv2.putText(frame, 'POSE QUALITY', (20, 35),
                cv2.FONT_HERSHEY_DUPLEX, 0.6, (255, 255, 255), 2)
    cv2.putText(frame, f'{quality}%', (20, 70),
                cv2.FONT_HERSHEY_DUPLEX, 1.5, (255, 255, 255), 2)
    
    # STAGE text
    cv2.putText(frame, 'STAGE', (160, 35),
                cv2.FONT_HERSHEY_DUPLEX, 0.6, (255, 255, 255), 2)
    cv2.putText(frame, stage, (160, 70),
                cv2.FONT_HERSHEY_DUPLEX, 1.2, (255, 255, 255), 2)
    
    # Landmarks visible
    cv2.putText(frame, f'Points: {visible_landmarks}/33', (20, 105),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

def draw_instructions(frame, stage, quality):
    h, w = frame.shape[:2]
    
    # Instruction based on quality
    if quality >= 19:
        msg = '✓ Perfect! Hold still for capture'
        color = (0, 255, 0)
    elif quality >= 10:
        msg = 'Good - Minor adjustments needed'
        color = (0, 255, 255)
    else:
        msg = 'Adjust position - Stand back and center yourself'
        color = (0, 165, 255)  # Orange in BGR
    
    # Black bar at bottom
    cv2.rectangle(frame, (0, h-50), (w, h), (0, 0, 0), -1)
    
    # Instruction text
    text_size = cv2.getTextSize(msg, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)[0]
    text_x = (w - text_size[0]) // 2
    cv2.putText(frame, msg, (text_x, h-20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

def main():
    import os
    os.makedirs('results', exist_ok=True)
    
    # Get user information
    height, weight, age, gender = get_user_info()
    
    # Open camera
    cap = cv2.VideoCapture(0)
    
    # CRITICAL: If the 720p resolution is not supported by the webcam, OpenCV might
    # fallback to a default (like 640x480).
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    
    if not cap.isOpened():
        print('ERROR: Could not open camera!')
        return
    
    print('✅ Camera opened! You should see yourself on screen now.')
    print('Press Q to quit')
    
    ready_frames = 0
    stage = 'positioning'
    
    while True:
        # Read frame from camera
        ret, frame = cap.read()
        if not ret:
            print('Failed to read frame')
            break
        
        # MIRROR VIEW - flip horizontally so user sees themselves naturally
        frame = cv2.flip(frame, 1)
        
        # Convert to RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process with MediaPipe
        results = pose.process(rgb_frame)
        
        if results.pose_landmarks:
            # Draw skeleton on the frame
            mp_drawing.draw_landmarks(
                frame,
                results.pose_landmarks,
                mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style()
            )
            
            # Get landmarks
            landmarks = results.pose_landmarks.landmark
            h, w = frame.shape[:2]
            
            # Calculate quality
            quality, visible = calculate_pose_quality(landmarks, w)
            
            # Determine stage
            if quality >= 19:
                stage = 'ready'
                ready_frames += 1
            elif quality >= 10:
                stage = 'adjusting'
                ready_frames = 0
            else:
                stage = 'positioning'
                ready_frames = 0
            
            # Draw status overlay
            draw_status_overlay(frame, quality, visible, stage)
            
            # Draw instructions
            draw_instructions(frame, stage, quality)
            
            # Auto-capture check
            if ready_frames >= 45:  # 3 seconds at 15fps
                # Capture photo
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                filename = f'results/captured_{timestamp}.jpg'
                cv2.imwrite(filename, frame)
                print(f'\n📸 Photo captured: {filename}')
                
                # Automatically run classification!
                cat = classify_and_show_results(frame, landmarks, height, weight, age, gender)
                
                # Flash effect logic (we don't waitKey here since matplotlib blocks anyway, just a quick print)
                print("--- Processing Complete. Continue posing or press Q to exit ---")
                
                ready_frames = 0
        
        else:
            # No person detected
            h, w = frame.shape[:2]
            cv2.putText(frame, 'NO PERSON DETECTED', (w//2 - 250, h//2),
                       cv2.FONT_HERSHEY_DUPLEX, 1.2, (0, 0, 255), 3)
            cv2.putText(frame, 'Step into frame', (w//2 - 150, h//2 + 50),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        
        # SHOW THE FRAME WITH MATPLOTLIB (Fallback logic)
        plt.imshow(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        plt.title('Live Body Tracking - Press Q in terminal or Ctrl+C to quit')
        plt.axis('off')
        plt.pause(0.01)
        plt.clf()
        
        # Check for quit
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q') or key == ord('Q'):
            print('\nQuitting...')
            break
        elif key == ord(' '):  # Space bar for manual capture
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'results/manual_{timestamp}.jpg'
            cv2.imwrite(filename, frame)
            print(f'\n📸 Manual capture: {filename}')
            
            # Automatically run classification for manual captures too!
            if results.pose_landmarks:
                landmarks = results.pose_landmarks.landmark
                classify_and_show_results(frame, landmarks, height, weight, age, gender)
            else:
                print("❌ No pose detected to classify.")
    
    # Cleanup
    cap.release()
    plt.close()
    print('Camera closed.')

if __name__ == '__main__':
    main()