import pandas as pd
import numpy as np
import os
import json
from datetime import datetime

from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import (classification_report, confusion_matrix,
                             accuracy_score)
import joblib


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_dataset():
    df = pd.read_csv('dataset/body_classification_dataset.csv')
    print(f'✅ Loaded dataset: {len(df)} samples')
    print(f'   Categories : {sorted(df["body_category"].unique())}')
    return df


# ---------------------------------------------------------------------------
# Feature engineering
# ---------------------------------------------------------------------------

def prepare_features(df):
    gender_encoder = LabelEncoder()
    df = df.copy()
    df['gender_encoded'] = gender_encoder.fit_transform(df['gender'])

    feature_columns = [
        'bmi',
        'waist_hip_ratio',
        'shoulder_waist_ratio',
        'torso_leg_ratio',
        'body_aspect_ratio',
        'age',
        'gender_encoded'
    ]

    X = df[feature_columns].values

    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(df['body_category'])

    print(f'\n📊 Features prepared: {X.shape}')
    print(f'   Features   : {feature_columns}')
    print(f'   Classes    : {label_encoder.classes_.tolist()}')

    return X, y, feature_columns, label_encoder, gender_encoder


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

def train_model(X_train, y_train, X_val, y_val):
    print('\n🎯 Training Random Forest Classifier (GridSearchCV)…')

    param_grid = {
        'n_estimators':     [100, 200, 300],
        'max_depth':        [10, 15, 20],
        'min_samples_split':[5, 10, 15],
        'min_samples_leaf': [2, 5, 10]
    }

    rf = RandomForestClassifier(
        random_state=42,
        class_weight='balanced',
        n_jobs=-1
    )

    grid_search = GridSearchCV(
        rf, param_grid,
        cv=5, scoring='accuracy',
        n_jobs=-1, verbose=1
    )
    grid_search.fit(X_train, y_train)

    print(f'\n✅ Best parameters : {grid_search.best_params_}')
    print(f'   Best CV score  : {grid_search.best_score_:.4f}')

    best_model = grid_search.best_estimator_
    val_acc    = best_model.score(X_val, y_val)
    print(f'   Validation acc : {val_acc:.4f}')

    return best_model, grid_search.best_params_


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------

def evaluate_model(model, X_test, y_test, label_encoder):
    print('\n📈 Model Evaluation:')

    y_pred       = model.predict(X_test)
    accuracy     = accuracy_score(y_test, y_pred)

    print(f'\n   Test Accuracy : {accuracy:.4f}')
    print('\nClassification Report:')
    print(classification_report(
        y_test, y_pred,
        target_names=label_encoder.classes_,
        digits=4
    ))
    print('Confusion Matrix:')
    cm = confusion_matrix(y_test, y_pred)
    print(cm)

    return {
        'accuracy':          float(accuracy),
        'confusion_matrix':  cm.tolist(),
        'feature_importance':model.feature_importances_.tolist()
    }


# ---------------------------------------------------------------------------
# Persist artefacts
# ---------------------------------------------------------------------------

def save_model_artifacts(model, scaler, label_encoder, gender_encoder,
                         feature_columns, metrics, best_params):
    os.makedirs('models', exist_ok=True)

    joblib.dump(model,          'models/body_classifier.pkl')
    joblib.dump(scaler,         'models/scaler.pkl')
    joblib.dump(label_encoder,  'models/label_encoder.pkl')
    joblib.dump(gender_encoder, 'models/gender_encoder.pkl')

    metadata = {
        'model_type':      'RandomForestClassifier',
        'training_date':   datetime.now().isoformat(),
        'feature_columns': feature_columns,
        'classes':         label_encoder.classes_.tolist(),
        'hyperparameters': best_params,
        'metrics':         metrics,
    }
    with open('models/model_metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)

    print('\n✅ Saved: models/body_classifier.pkl')
    print('✅ Saved: models/scaler.pkl')
    print('✅ Saved: models/label_encoder.pkl  &  gender_encoder.pkl')
    print('✅ Saved: models/model_metadata.json')


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print('=' * 60)
    print(' BODY CLASSIFICATION — MODEL TRAINING PIPELINE')
    print('=' * 60)

    df = load_dataset()
    X, y, feature_columns, label_encoder, gender_encoder = prepare_features(df)

    # 70 % train | 15 % val | 15 % test
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.30, random_state=42, stratify=y
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp
    )

    print(f'\n📊 Data split  →  train={len(X_train)}  val={len(X_val)}  test={len(X_test)}')

    scaler         = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled   = scaler.transform(X_val)
    X_test_scaled  = scaler.transform(X_test)

    model, best_params = train_model(X_train_scaled, y_train, X_val_scaled, y_val)
    metrics            = evaluate_model(model, X_test_scaled, y_test, label_encoder)

    print('\n🎯 Feature Importance:')
    for feat, imp in sorted(
            zip(feature_columns, metrics['feature_importance']),
            key=lambda x: x[1], reverse=True):
        print(f'   {feat:<25s}: {imp:.4f}')

    save_model_artifacts(model, scaler, label_encoder, gender_encoder,
                         feature_columns, metrics, best_params)

    print('\n' + '=' * 60)
    print(f'✅ TRAINING COMPLETE!   Test Accuracy: {metrics["accuracy"]:.2%}')
    print('=' * 60)


if __name__ == '__main__':
    main()
