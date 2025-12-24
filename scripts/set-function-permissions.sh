#!/bin/bash

# Script to set IAM permissions for Firebase Functions to allow public access
# This is required even when invoker: 'public' is set in the function code

PROJECT_ID="dawn-naglich"
REGION="us-central1"

FUNCTIONS=(
  "getCalendarEventsSecure"
  "createCalendarEventSecure"
  "confirmCalendarEventSecure"
  "cancelCalendarEventSecure"
  "generateGeminiResponse"
  "createGeminiLiveSession"
  "proxyGeminiLiveMessage"
)

echo "Setting IAM permissions for Firebase Functions..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

for FUNCTION_NAME in "${FUNCTIONS[@]}"; do
  echo "Setting permissions for $FUNCTION_NAME..."
  
  # For 2nd gen functions, use Cloud Run IAM commands
  # 2nd gen functions run on Cloud Run, so we need to set Cloud Run invoker permissions
  gcloud run services add-iam-policy-binding "${FUNCTION_NAME}" \
    --region="${REGION}" \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --project="${PROJECT_ID}" \
    2>&1 | grep -v "WARNING" || echo "  Error setting Cloud Run permissions"
  
  # Also try the functions command for compatibility
  gcloud functions add-iam-policy-binding "${FUNCTION_NAME}" \
    --region="${REGION}" \
    --gen2 \
    --member="allUsers" \
    --role="roles/cloudfunctions.invoker" \
    --project="${PROJECT_ID}" \
    2>&1 | grep -v "WARNING" || echo "  Note: Using Cloud Run permissions instead"
  
  echo ""
done

echo "IAM permissions set for all functions."
echo "You may need to wait a few moments for changes to propagate."

