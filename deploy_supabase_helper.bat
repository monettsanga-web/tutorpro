@echo off
cls
title TutorPro English - Supabase Deploy Helper Script (Windows)

echo ==================================================================
echo     🎓 TutorPro English - Supabase Deploy Helper Script (Windows) 🎓
echo ==================================================================
echo.
echo This script will automatically configure and deploy your secure 
echo get-cos-credentials Edge Function to Supabase for you.
echo.

:: Check Node
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js is not installed on your computer.
    echo Please download and install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Check Supabase CLI
where supabase >nul 2>nul
if %errorlevel% neq 0 (
    echo 🔄 Installing Supabase CLI tool...
    call npm install -g supabase
)

echo.
echo ==================================================================
echo 🔑 STEP 1: Log in to Supabase
echo ==================================================================
echo Press any key. A browser window will open to log in.
echo Copy the token from your browser, paste it here, and press Enter.
echo.
pause
call supabase login

echo.
echo ==================================================================
echo 📡 STEP 2: Link your Project
echo ==================================================================
echo Please enter your Supabase Project Reference ID.
echo You can find this on your Supabase dashboard URL (e.g. https://supabase.com/dashboard/project/abcde...)
echo It is a 20-character code like: losmkvvwzijipqrlelyt
echo.
set /p PROJECT_REF="Project Ref ID: "

if "%PROJECT_REF%"=="" (
    echo ❌ Error: Project Reference ID cannot be empty.
    pause
    exit /b 1
)

echo 🔄 Linking your database project...
call supabase link --project-ref %PROJECT_REF%

echo.
echo ==================================================================
echo 🚀 STEP 3: Deploy the Secure Sharing Gate
echo ==================================================================
echo Now deploying 'get-cos-credentials'...
echo.
call supabase functions deploy get-cos-credentials

if %errorlevel% eq 0 (
    echo.
    echo 🎉 SUCCESS! Your Tencent COS Classroom storage is now fully LIVE!
    echo Your website is fully integrated and ready to share PPT/PDF slide pages.
) else (
    echo.
    echo ❌ Deployment encountered an error. Please verify your Project Ref ID and try again.
)

echo.
pause
