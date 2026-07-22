#!/bin/bash

# Clear terminal screen
clear

echo "=================================================================="
echo "    🎓 TutorPro English - Supabase Deploy Helper Script (Mac/Linux) 🎓"
echo "=================================================================="
echo ""
echo "This script will automatically configure and deploy your secure "
echo "get-cos-credentials Edge Function to Supabase for you."
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null
then
    echo "❌ Error: Node.js (npm) is not installed on your computer."
    echo "Please download and install Node.js from https://nodejs.org/"
    read -p "Press Enter to exit..."
    exit 1
fi

# Step 1: Install Supabase CLI locally if not already installed
if ! command -v supabase &> /dev/null
then
    echo "🔄 Installing Supabase CLI tool on your computer..."
    npm install -g supabase
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Supabase CLI globally. Trying local project install..."
        npm install --save-dev supabase
    fi
fi

echo "✅ Supabase CLI is ready."
echo ""

# Step 2: Log in
echo "=================================================================="
echo "🔑 STEP 1: Log in to Supabase"
echo "=================================================================="
echo "Press Enter. A browser window will open to log in."
echo "Copy the token from your browser, paste it here, and press Enter."
echo ""
supabase login

# Step 3: Get Project Ref ID
echo ""
echo "=================================================================="
echo "📡 STEP 2: Link your Project"
echo "=================================================================="
echo "Please enter your Supabase Project Reference ID."
echo "You can find this on your Supabase dashboard URL (e.g. https://supabase.com/dashboard/project/abcde...)"
echo "It is a 20-character code like: losmkvvwzijipqrlelyt"
echo ""
read -p "Project Ref ID: " PROJECT_REF

if [ -z "$PROJECT_REF" ]
then
      echo "❌ Error: Project Reference ID cannot be empty."
      read -p "Press Enter to exit..."
      exit 1
fi

echo "🔄 Linking your database project..."
supabase link --project-ref "$PROJECT_REF"

# Step 4: Deploy
echo ""
echo "=================================================================="
echo "🚀 STEP 3: Deploy the Secure Sharing Gate"
echo "=================================================================="
echo "Now deploying 'get-cos-credentials'..."
echo ""
supabase functions deploy get-cos-credentials

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SUCCESS! Your Tencent COS Classroom storage is now fully LIVE!"
    echo "Your website is fully integrated and ready to share PPT/PDF slide pages."
else
    echo ""
    echo "❌ Deployment encountered an error. Please verify your Project Ref ID and try again."
fi

echo ""
read -p "Press Enter to close this helper script..."
