@echo off
setlocal

set "PROJECT_DIR=%~dp0"
echo Starting Khet-Khamar from: %PROJECT_DIR%

pushd "%PROJECT_DIR%"
npm.cmd start
popd

endlocal
