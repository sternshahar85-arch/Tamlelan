@echo off
echo ==========================================
echo TAMLELAN V1.1 - PyInstaller Build Script
echo ==========================================

echo [1/3] Cleaning old build caches...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist scribe.spec del /q scribe.spec

echo.
echo [2/3] Compiling scribe.py into standalone executable...
:: --noconsole hides the CMD window
:: --onefile packages everything into a single .exe
:: SECURITY: service_account.json is NOT bundled into the exe (--add-data)
:: anymore - a PyInstaller onefile archive can be extracted trivially, which
:: would leak the credentials. It is copied next to the exe instead.
pyinstaller --noconsole --onefile scribe.py

echo.
echo [3/3] Verifying build...
if exist dist\scribe.exe (
    copy /y service_account.json dist\service_account.json >nul
    echo ==========================================
    echo SUCCESS: scribe.exe has been generated!
    echo You can find it inside the 'dist' folder.
    echo service_account.json was copied next to it - keep the two together,
    echo and never share or commit that file.
    echo ==========================================
) else (
    echo ==========================================
    echo ERROR: Compilation failed. Check the console output above.
    echo ==========================================
)
pause