import numpy as np
import pandas as pd
import os
from datetime import datetime

# Standard BMI Categories (from Image 2)
BMI_CATEGORIES = {
    'under_weight':    {'min': 14.0, 'max': 18.4},
    'normal':          {'min': 18.5, 'max': 24.9},
    'overweight':      {'min': 25.0, 'max': 29.9},
    'obese':           {'min': 30.0, 'max': 34.9},
    'extremely_obese': {'min': 35.0, 'max': 45.0}
}


def calculate_bmi(weight_kg, height_cm):
    height_m = height_cm / 100
    return weight_kg / (height_m ** 2)


def generate_body_measurements(category, gender, age):
    """Generate realistic body measurements for a given category."""

    # Height ranges (cm)
    if gender == 'male':
        height = np.random.uniform(160, 185)
    else:
        height = np.random.uniform(150, 175)

    # Generate weight based on BMI category
    bmi_range = BMI_CATEGORIES.get(category, BMI_CATEGORIES['normal'])
    target_bmi = np.random.uniform(bmi_range['min'], bmi_range['max'])
    weight = target_bmi * ((height / 100) ** 2)

    bmi = calculate_bmi(weight, height)

    # Body ratios tuned per category & gender
    if category == 'under_weight':
        waist_hip_ratio    = np.random.uniform(0.70, 0.82)
        shoulder_waist_ratio = np.random.uniform(1.3, 1.5)
        torso_leg_ratio    = np.random.uniform(0.45, 0.52)

    elif category == 'normal':
        if gender == 'male':
            waist_hip_ratio      = np.random.uniform(0.85, 0.95)
            shoulder_waist_ratio = np.random.uniform(1.35, 1.5)
        else:
            waist_hip_ratio      = np.random.uniform(0.75, 0.85)
            shoulder_waist_ratio = np.random.uniform(1.25, 1.4)
        torso_leg_ratio = np.random.uniform(0.48, 0.54)

    elif category == 'overweight':
        if gender == 'male':
            waist_hip_ratio      = np.random.uniform(0.95, 1.05)
            shoulder_waist_ratio = np.random.uniform(1.15, 1.30)
        else:
            waist_hip_ratio      = np.random.uniform(0.85, 0.95)
            shoulder_waist_ratio = np.random.uniform(1.15, 1.30)
        torso_leg_ratio = np.random.uniform(0.50, 0.56)

    elif category == 'obese':
        waist_hip_ratio      = np.random.uniform(1.0, 1.15)
        shoulder_waist_ratio = np.random.uniform(1.0, 1.20)
        torso_leg_ratio      = np.random.uniform(0.52, 0.58)
        
    else:  # extremely_obese
        waist_hip_ratio      = np.random.uniform(1.1, 1.25)
        shoulder_waist_ratio = np.random.uniform(0.95, 1.15)
        torso_leg_ratio      = np.random.uniform(0.54, 0.60)

    # Simulate pixel measurements (640×480 frame; person ≈ 70% of height)
    image_height   = 480
    person_height_px = int(image_height * 0.7)

    shoulder_width_px = int(person_height_px * 0.35 * (1 + (bmi - 22) * 0.02))
    waist_width_px    = int(shoulder_width_px / shoulder_waist_ratio)
    hip_width_px      = int(waist_width_px / waist_hip_ratio)
    torso_height_px   = int(person_height_px * torso_leg_ratio)
    body_aspect_ratio = person_height_px / shoulder_width_px

    return {
        'age':                 age,
        'gender':              gender,
        'height_cm':           round(height, 1),
        'weight_kg':           round(weight, 1),
        'bmi':                 round(bmi, 2),
        'shoulder_width_px':   shoulder_width_px,
        'waist_width_px':      waist_width_px,
        'hip_width_px':        hip_width_px,
        'torso_height_px':     torso_height_px,
        'total_height_px':     person_height_px,
        'waist_hip_ratio':     round(waist_hip_ratio, 3),
        'shoulder_waist_ratio':round(shoulder_waist_ratio, 3),
        'torso_leg_ratio':     round(torso_leg_ratio, 3),
        'body_aspect_ratio':   round(body_aspect_ratio, 3),
        'body_category':       category
    }


def generate_pcos_samples(n_samples=200):
    """Generate PCOS-risk samples (female-specific, android fat distribution)."""
    samples = []

    for i in range(n_samples):
        age = np.random.randint(18, 35)

        # PCOS: BMI > 23 (Asian cutoff) + high waist-hip ratio
        target_bmi = np.random.uniform(23.0, 35)
        height     = np.random.uniform(150, 175)
        weight     = target_bmi * ((height / 100) ** 2)
        bmi        = calculate_bmi(weight, height)

        waist_hip_ratio      = np.random.uniform(0.85, 1.0)
        shoulder_waist_ratio = np.random.uniform(1.15, 1.35)
        torso_leg_ratio      = np.random.uniform(0.50, 0.56)

        image_height      = 480
        person_height_px  = int(image_height * 0.7)
        shoulder_width_px = int(person_height_px * 0.32 * (1 + (bmi - 22) * 0.02))
        waist_width_px    = int(shoulder_width_px / shoulder_waist_ratio)
        hip_width_px      = int(waist_width_px / waist_hip_ratio)
        torso_height_px   = int(person_height_px * torso_leg_ratio)
        body_aspect_ratio = person_height_px / shoulder_width_px

        samples.append({
            'person_id':           f'PCOS_{i:04d}',
            'age':                 age,
            'gender':              'female',
            'height_cm':           round(height, 1),
            'weight_kg':           round(weight, 1),
            'bmi':                 round(bmi, 2),
            'shoulder_width_px':   shoulder_width_px,
            'waist_width_px':      waist_width_px,
            'hip_width_px':        hip_width_px,
            'torso_height_px':     torso_height_px,
            'total_height_px':     person_height_px,
            'waist_hip_ratio':     round(waist_hip_ratio, 3),
            'shoulder_waist_ratio':round(shoulder_waist_ratio, 3),
            'torso_leg_ratio':     round(torso_leg_ratio, 3),
            'body_aspect_ratio':   round(body_aspect_ratio, 3),
            'body_category':       'pcos_risk'
        })

    return samples


def generate_complete_dataset():
    """Generate the complete 1 500-sample training dataset."""

    np.random.seed(42)
    all_samples = []

    distribution = {
        'under_weight':    250,
        'normal':          400,
        'overweight':      350,
        'obese':           300,
        'extremely_obese': 200
    }

    sample_id = 0
    for category, n_samples in distribution.items():
        print(f'Generating {n_samples} samples for {category}...')
        for _ in range(n_samples):
            age    = np.random.randint(18, 40)
            gender = np.random.choice(['male', 'female'])
            m      = generate_body_measurements(category, gender, age)
            m['person_id'] = f'{category[:3].upper()}_{sample_id:04d}'
            all_samples.append(m)
            sample_id += 1

    df = pd.DataFrame(all_samples)

    column_order = [
        'person_id', 'age', 'gender', 'height_cm', 'weight_kg', 'bmi',
        'shoulder_width_px', 'waist_width_px', 'hip_width_px',
        'torso_height_px', 'total_height_px',
        'waist_hip_ratio', 'shoulder_waist_ratio', 'torso_leg_ratio',
        'body_aspect_ratio', 'body_category'
    ]
    df = df[column_order]

    os.makedirs('dataset', exist_ok=True)
    df.to_csv('dataset/body_classification_dataset.csv', index=False)

    print(f'\n>>> Dataset generated successfully!')
    print(f'Total samples  : {len(df)}')
    print(f'\nCategory distribution:')
    print(df['body_category'].value_counts())
    print(f'\nGender distribution:')
    print(df['gender'].value_counts())
    print(f'\nDataset saved  : dataset/body_classification_dataset.csv')
    return df


if __name__ == '__main__':
    df = generate_complete_dataset()

    print('\n📊 Dataset Statistics:')
    print('\nBMI ranges by category:')
    print(df.groupby('body_category')['bmi'].agg(['min', 'mean', 'max']).round(2))
    print('\nWaist-Hip Ratio by category:')
    print(df.groupby('body_category')['waist_hip_ratio'].agg(['min', 'mean', 'max']).round(3))
