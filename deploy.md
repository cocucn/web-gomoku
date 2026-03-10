# GitHub 与 GitHub Pages 部署说明

本文档基于 2026 年 3 月 10 日的 GitHub 常见界面流程编写，适用于本项目这种纯静态网页。

## 1. 本地目录准备

确认项目目录下至少包含这些文件：

- `web-gomoku.html`
- `styles.css`
- `game.js`
- `prd.md`
- `design.md`
- `tasklist.md`
- `deploy.md`

如果你希望 GitHub Pages 默认首页直接打开游戏，建议仓库根目录保留这些文件，不再额外套子目录。

## 2. 初始化 Git 仓库

在项目目录执行：

```bash
git init
git add .
git commit -m "feat: initial web gomoku game"
```

如果本机还没配置 Git 用户信息，可先执行：

```bash
git config --global user.name "你的 GitHub 用户名"
git config --global user.email "你的邮箱"
```

## 3. 在 GitHub 创建仓库

1. 打开 GitHub 并登录
2. 点击右上角 `+`
3. 选择 `New repository`
4. 输入仓库名，例如 `web-gomoku`
5. 可选择 `Public`
6. 点击 `Create repository`

创建后，GitHub 会展示一组命令。对于当前本地已有代码的情况，通常执行下面这组：

```bash
git remote add origin https://github.com/你的用户名/web-gomoku.git
git branch -M main
git push -u origin main
```

如果你使用 SSH，也可以把远程地址改成：

```bash
git remote add origin git@github.com:你的用户名/web-gomoku.git
```

## 4. 配置 GitHub Pages

代码推送完成后：

1. 打开仓库主页
2. 点击 `Settings`
3. 在左侧进入 `Pages`
4. 在 `Build and deployment` 中找到 `Source`
5. 选择 `Deploy from a branch`
6. Branch 选择 `main`
7. Folder 选择 `/(root)`
8. 点击 `Save`

等待 GitHub 部署完成。

## 5. 访问线上地址

成功后，页面通常会提供一个地址：

```text
https://你的用户名.github.io/web-gomoku/
```

因为本项目首页文件名是 `web-gomoku.html`，有两种推荐方式：

### 方式 A：新增一个 `index.html`

最省心的方式是在仓库根目录增加一个 `index.html`，内容可以直接跳转到 `web-gomoku.html`，例如：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=./web-gomoku.html">
  <title>Redirect</title>
</head>
<body></body>
</html>
```

这样访问仓库根地址就会直接进入游戏。

### 方式 B：直接访问具体文件

如果你不新增 `index.html`，可以直接访问：

```text
https://你的用户名.github.io/web-gomoku/web-gomoku.html
```

本项目当前已满足这种访问方式。

## 6. 后续更新流程

以后每次更新代码后执行：

```bash
git add .
git commit -m "feat: update gomoku game"
git push
```

GitHub Pages 会自动重新部署。通常几秒到几分钟内生效。

## 7. 常见问题排查

### 7.1 页面 404

检查：

- Pages 是否已经开启
- 分支是否是 `main`
- Pages 的目录是否为 `/(root)`
- 访问地址是否正确

### 7.2 页面样式或脚本没生效

检查：

- `web-gomoku.html` 中引用路径是否为相对路径
- `styles.css` 和 `game.js` 是否和 HTML 位于同一目录
- 浏览器是否缓存旧版本，尝试强制刷新

### 7.3 推送失败

检查：

- GitHub 远程仓库地址是否正确
- 是否已登录或配置 SSH Key
- 是否有仓库写权限

## 8. 发布建议

- 仓库建议设置 `README.md`，说明项目截图和在线地址
- 发布前在手机浏览器和桌面浏览器各验证一遍
- 如果准备对外展示，建议补一个 `index.html` 作为默认入口
