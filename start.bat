@echo off
echo ==================================================
echo   Lancement de LifeGuard AI (Risk Life Management)
echo ==================================================
echo.

echo [1/2] Lancement du Backend (Serveur Node.js)...
start "Backend - LifeGuard AI" cmd /k "cd backend && npm start"

echo [2/2] Lancement du Frontend (Application Mobile Expo)...
start "Mobile - LifeGuard AI" cmd /k "cd mobile && npx expo start -c"

echo.
echo Les deux terminaux sont ouverts dans de nouvelles fenetres !
echo Vous pouvez fermer cette fenetre principale.
pause
