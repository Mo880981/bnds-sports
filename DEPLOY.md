# BNDS 运动圈 · 部署指南

## 方式 A：GitHub 网页上传 + Vercel（推荐，不用装 Git）

### 1. 上传到 GitHub

1. 打开 [github.com/new](https://github.com/new)
2. Repository name 填 **`bnds-sports`**
3. 选 **Public**，不要勾选 README（本地已有）
4. 点 **Create repository**
5. 在新仓库页点 **uploading an existing file**
6. 把 `bnds-sports` 文件夹里**所有文件和文件夹**拖进去（含 `css/`、`js/`、各 `.html` 等）
7. 底部 Commit message 填 `Initial commit`，点 **Commit changes**

### 2. 部署到 Vercel

1. 打开 [vercel.com/new](https://vercel.com/new)
2. 选 **Import Git Repository** → 找到 **`Mo880981/bnds-sports`**
3. Project Name 保持 `bnds-sports`
4. Framework Preset 选 **Other**
5. 直接点 **Deploy**
6. 等约 1 分钟，出现 **Congratulations** 后点 **Visit**

你的域名类似：`https://bnds-sports.vercel.app`

### 3. 发给同学

- 首页：`https://bnds-sports.vercel.app/`
- 打卡：`https://bnds-sports.vercel.app/checkin.html`

---

## 方式 B：安装 Git 后命令行部署（可选）

若终端提示需要 Xcode Command Line Tools：

```bash
xcode-select --install
```

安装完成后在终端执行：

```bash
cd ~/Documents/bnds-sports
git init
git add .
git commit -m "Initial commit: BNDS 运动圈"
gh repo create bnds-sports --public --source=. --push
```

然后在 Vercel **Add New → Project** 导入该仓库即可。

---

## 更新网站

- **方式 A**：改完代码后，在 GitHub 仓库里 Upload files 覆盖，或安装 Git 后用 `git push`
- **方式 B**：`git add . && git commit -m "更新" && git push`，Vercel 会自动重新部署

---

## Supabase 提醒

约练功能需要在 Supabase SQL Editor 运行 `supabase-setup.sql` 末尾「约练搭子」那一段。
