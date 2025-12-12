@echo off
REM 发布 ztools-api-types 到独立仓库的脚本（Windows 版本）

echo 📦 准备发布 ztools-api-types 到独立仓库...
echo.

REM 检查是否在 ZTools 根目录
if not exist "ztools-api-types\" (
    echo ❌ 错误：请在 ZTools 根目录运行此脚本
    exit /b 1
)

set REMOTE_URL=https://github.com/ZToolsCenter/ztools-api-types.git

echo 📍 目标仓库: %REMOTE_URL%
echo.
echo ⚠️  请确保：
echo    1. 已在 GitHub 创建私有仓库: ZToolsCenter/ztools-api-types
echo    2. 仓库设置为 Private
echo    3. 没有初始化 README、.gitignore、license
echo.
pause

REM 检查是否有未提交的变更
git diff --quiet ztools-api-types/
if errorlevel 1 (
    echo ⚠️  ztools-api-types 有未提交的变更
    set /p COMMIT="是否先提交这些变更？(y/N) "
    if /i "%COMMIT%"=="y" (
        git add ztools-api-types/
        git commit -m "feat(ztools-api-types): prepare for publish"
    )
)

REM 使用 git subtree 推送
echo 🚀 使用 git subtree 推送到远程仓库...
git subtree push --prefix=ztools-api-types %REMOTE_URL% main

echo.
echo ✅ 发布完成！
echo.
echo 📝 下一步：
echo    1. 访问 https://github.com/ZToolsCenter/ztools-api-types
echo    2. 确认仓库设置为 Private
echo    3. 添加 README 和描述
echo    4. (可选) 发布到 npm: cd 到该仓库 ^&^& npm publish
echo.
pause
