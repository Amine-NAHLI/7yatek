@echo off
echo ==================================================
echo   Installation du projet 7YATK (LifeGuard AI)
echo ==================================================
echo.
echo [1/3] Installation des dependances du Backend...
cd backend
call npm install
cd ..

echo.
echo [2/3] Installation des dependances de l'Application Mobile (Expo)...
cd mobile
call npm install
cd ..

echo.
echo [3/3] Installation des dependances de la Carte 3D (God's Eye View)...
cd gods-eye-view
call npm install
cd ..

echo.
echo ==================================================
echo   Installation terminee avec succes !
echo   - N'oubliez pas de configurer le fichier backend/.env
echo   - Vous pouvez maintenant lancer le projet avec start.bat
echo ==================================================
pause
