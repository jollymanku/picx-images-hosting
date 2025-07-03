let token = "";
let allPosts = [];
let postIndex = 0;
const pageSize = 10;
let isLoading = false;

let uploadedImages = [];
let editingPostId = null;

document.getElementById("uploadImages").addEventListener("change", async (e) => {
  const files = Array.from(e.target.files).slice(0, 9 - uploadedImages.length);
  for (const file of files) {
    const base64 = await toBase64(file);
    uploadedImages.push(base64);
  }
  renderImagePreview();
});

function renderImagePreview() {
  const container = document.getElementById("previewImages");
  container.innerHTML = "";
  uploadedImages.forEach((img, idx) => {
    const wrapper = document.createElement("div");
    wrapper.className = "relative group";
    wrapper.innerHTML = `
      <img src="${img}" class="post-image">
      <button onclick="removeImage(${idx})" class="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">
        <i class="fas fa-times text-xs"></i>
      </button>
    `;
    container.appendChild(wrapper);
  });
}

function removeImage(index) {
  uploadedImages.splice(index, 1);
  renderImagePreview();
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

async function adminLogin() {
  const password = document.getElementById('adminPassword').value;
  const totpCode = document.getElementById('adminTotpCode').value; // <-- 新增这一行

  if (!password || !totpCode) { // <-- 更新这里，确保两者都必须填写
    showAlert('请输入密码和两步验证码', 'warning');
    return;
  }

  try {
    const res = await fetch('/admin/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ password, totpCode }) // <-- 更新这里，发送 totpCode
    });

    if (res.ok) {
      const data = await res.json();
      // 注意：这里 token 仍是 password 的哈希值，如果需要更安全的 token 机制，请考虑 JWT
      token = data.token;
      localStorage.setItem("admin_token", token);
      document.getElementById('loginSection').style.display = 'none';
      document.getElementById('adminSection').classList.remove('hidden');
      showAlert('登录成功', 'success');
      await fetchPosts();
    } else {
      const errorData = await res.json();
      showAlert(errorData.error || '登录失败', 'error');
    }
  } catch (error) {
    showAlert('网络错误，请重试', 'error');
  }
}

function logout() {
  localStorage.removeItem("admin_token");
  showAlert('已退出登录', 'info');
  setTimeout(() => location.reload(), 1000);
}

function checkSavedLogin() {
  const saved = localStorage.getItem("admin_token");
  if (saved) {
    token = saved;
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('adminSection').classList.remove('hidden');
    fetchPosts();
  }
}
checkSavedLogin();

async function fetchPosts() {
  try {
    showLoading(true);
    
    // 使用 URL 参数传递 token 而不是请求体
    const url = new URL('/api/posts', window.location.origin);
    url.searchParams.append('token', token);
    
    const res = await fetch(url, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
      // 移除了 body
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || '加载失败');
    }
    
    const json = await res.json();
    allPosts = Array.isArray(json) ? json : [];
    postIndex = 0;
    document.getElementById('postList').innerHTML = '';
    document.getElementById('postCount').textContent = allPosts.length;
    loadMorePosts();
  } catch (error) {
    showAlert(`加载动态失败: ${error.message}`, 'error');
    console.error('加载动态错误:', error);
  } finally {
    showLoading(false);
  }
}

function loadMorePosts() {
  if (isLoading || postIndex >= allPosts.length) return;
  isLoading = true;
  document.getElementById('loading').classList.remove('hidden');

  requestAnimationFrame(() => {
    const container = document.getElementById('postList');
    const slice = allPosts.slice(postIndex, postIndex + pageSize);
    
    slice.forEach(post => {
      const div = document.createElement('div');
      div.className = 'card';
      div.innerHTML = `
        <div class="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-gray-700">${post.date}</span>
            ${post.protected ? '<span class="tag tag-warning"><i class="fas fa-lock mr-1"></i>加密</span>' : '<span class="tag tag-success"><i class="fas fa-lock-open mr-1"></i>公开</span>'}
          </div>
          <div class="flex items-center gap-1">
            <span class="tag tag-primary"><i class="fas fa-heart mr-1"></i>${post.likes || 0}</span>
            <span class="tag tag-secondary"><i class="fas fa-image mr-1"></i>${post.images?.length || 0}</span>
          </div>
        </div>
        <div class="px-4 py-3">
          <p class="text-gray-700 mb-3">${post.content}</p>
          <div class="flex flex-col md:flex-row gap-3 mt-3">
            <div class="flex-1">
              <input type="text" placeholder="设置访问密码" class="input-field text-sm" id="pass-${post.id}">
            </div>
            <div class="flex flex-wrap gap-2">
              <button onclick="setPassword('${post.id}')" class="btn btn-primary text-sm">
                <i class="fas fa-lock mr-1"></i>加密
              </button>
              <button onclick='editPost(${JSON.stringify(post)})' class="btn btn-warning text-sm">
                <i class="fas fa-edit mr-1"></i>编辑
              </button>
              <button onclick="deletePost('${post.id}')" class="btn btn-danger text-sm">
                <i class="fas fa-trash-alt mr-1"></i>删除
              </button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(div);
    });

    postIndex += pageSize;
    isLoading = false;
    document.getElementById('loading').classList.add('hidden');
  });
}

let scrollTimeout;
window.addEventListener("scroll", () => {
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
      loadMorePosts();
    }
  }, 100);
});

async function setPassword(postId) {
  const pwd = document.getElementById(`pass-${postId}`).value;
  if (!pwd) {
    showAlert('请输入密码', 'warning');
    return;
  }
  
  try {
    const res = await fetch('/admin/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, password: pwd, token })
    });
    
    if (res.ok) {
      showAlert('密码设置成功', 'success');
      fetchPosts();
    } else {
      showAlert('设置失败', 'error');
    }
  } catch (error) {
    showAlert('网络错误，请重试', 'error');
  }
}

async function deletePost(id) {
  if (!confirm("确定要删除这条动态吗？此操作不可撤销！")) return;
  
  try {
    showLoading(true);
    
    // 构造URL参数
    const url = new URL('/api/delete-post', window.location.origin);
    url.searchParams.append('id', id);
    url.searchParams.append('token', token);
    
    const res = await fetch(url, { 
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await res.json();
    
    if (!res.ok || !data.success) {
      throw new Error(data.error || "删除失败");
    }
    
    showAlert('删除成功', 'success');
    await fetchPosts();
  } catch (error) {
    showAlert(`删除失败: ${error.message}`, 'error');
    console.error('删除错误:', error);
  } finally {
    showLoading(false);
  }
}

function editPost(post) {
  editingPostId = post.id;
  document.getElementById('formTitle').innerHTML = `<i class="fas fa-edit mr-2 text-blue-500"></i>编辑动态`;
  document.getElementById('newContent').value = post.content;
  document.getElementById('newImages').value = post.images?.filter(i => !i.startsWith('data:')).join(',') || '';
  uploadedImages = post.images?.filter(i => i.startsWith('data:')) || [];
  renderImagePreview();
  document.getElementById('newProtected').checked = post.protected || false;
  document.getElementById('newPassword').value = '';
  document.getElementById('customDate').value = post.timestamp ? new Date(post.timestamp).toISOString().split("T")[0] : '';
  document.getElementById('cancelEditBtn').classList.remove('hidden');
  document.getElementById('adminSection').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
  editingPostId = null;
  document.getElementById('formTitle').innerHTML = `<i class="fas fa-pen-alt mr-2 text-blue-500"></i>发布新动态`;
  document.getElementById('newContent').value = '';
  document.getElementById('newImages').value = '';
  uploadedImages = [];
  renderImagePreview();
  document.getElementById('newProtected').checked = false;
  document.getElementById('newPassword').value = '';
  document.getElementById('customDate').value = '';
  document.getElementById('cancelEditBtn').classList.add('hidden');
}

async function submitPost() {
  const content = document.getElementById('newContent').value.trim();
  if (!content) {
    showAlert('请填写动态内容', 'warning');
    return;
  }
  
  const imagesStr = document.getElementById('newImages').value;
  const isProtected = document.getElementById('newProtected').checked;
  const password = document.getElementById('newPassword').value;
  const dateInput = document.getElementById('customDate').value;

  if (isProtected && !password) {
    showAlert('请设置访问密码', 'warning');
    return;
  }

  const textImages = imagesStr ? imagesStr.split(',').map(i => i.trim()).filter(Boolean) : [];
  const allImages = [...textImages, ...uploadedImages].slice(0, 9);
  const passwordHash = password ? await hash(password) : null;

  const timestamp = dateInput ? new Date(dateInput).getTime() : Date.now();
  const date = new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const payload = {
    content,
    images: allImages,
    protected: isProtected,
    passwordHash,
    timestamp,
    date,
    token
  };
  
  if (editingPostId) {
    payload.id = editingPostId;
  }

  try {
    showLoading(true);
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    
    if (!res.ok || !data.success) {
      throw new Error(data.error || "保存失败");
    }
    
    showAlert(editingPostId ? "修改成功" : "发布成功", 'success');
    cancelEdit();
    await fetchPosts();
    
    // 自动生成静态页面
    await generateStaticHTML();
  } catch (error) {
    showAlert(`保存失败: ${error.message}`, 'error');
    console.error('保存错误:', error);
  } finally {
    showLoading(false);
  }
}

// 辅助函数：显示/隐藏加载状态
function showLoading(show) {
  const buttons = document.querySelectorAll('button');
  buttons.forEach(btn => {
    if (show) {
      btn.disabled = true;
      btn.querySelector('i')?.classList.add('fa-spin');
    } else {
      btn.disabled = false;
      btn.querySelector('i')?.classList.remove('fa-spin');
    }
  });
}

async function generateStaticHTML() {
  try {
    const res = await fetch('/api/render-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    
    if (res.ok) {
      showAlert("首页生成成功！", 'success');
    } else {
      showAlert("生成失败！", 'error');
    }
  } catch (error) {
    showAlert("网络错误，请重试", 'error');
  }
}

function previewPost() {
  const content = document.getElementById('newContent').value;
  const imagesStr = document.getElementById('newImages').value;
  const isProtected = document.getElementById('newProtected').checked;

  const textImages = imagesStr ? imagesStr.split(',').map(i => i.trim()).filter(Boolean) : [];
  const allImages = [...textImages, ...uploadedImages].slice(0, 9);

  const html = isProtected
    ? `<div class="post">
        <div class="post-header">
          <img src="https://img.0413.fun/assets/touxiang001.png" class="post-avatar">
          <div><div class="post-user">我</div><div class="post-time">预览</div></div>
        </div>
        <div class="post-protected" style="color: gray;">此内容需要密码访问</div>
      </div>`
    : `<div class="post">
        <div class="post-header">
          <img src="https://img.0413.fun/assets/touxiang001.png" class="post-avatar">
          <div><div class="post-user">我</div><div class="post-time">预览</div></div>
        </div>
        <div class="post-content">${content}</div>
        <div class="post-images">${allImages.map(img => `<img src="${img}" class="post-image" style="max-width:100px;margin:4px;">`).join('')}</div>
      </div>`;

  const win = window.open("", "_blank");
  win.document.write(`
    <html>
      <head>
        <title>预览动态</title>
        <style>
          body { font-family: sans-serif; padding: 20px; background: #f9f9f9; }
          .post-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
          .post-avatar { width: 40px; height: 40px; border-radius: 50%; }
          .post-user { font-weight: bold; }
          .post-content { margin: 10px 0; }
          .post-images { display: flex; flex-wrap: wrap; gap: 5px; }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `);
}

async function hash(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 显示提示消息
function showAlert(message, type = 'info') {
  const alert = document.createElement('div');
  const types = {
    info: { class: 'alert-info', icon: 'fas fa-info-circle' },
    success: { class: 'alert-success', icon: 'fas fa-check-circle' },
    warning: { class: 'alert-warning', icon: 'fas fa-exclamation-circle' },
    error: { class: 'alert-error', icon: 'fas fa-times-circle' }
  };
  
  alert.className = `alert ${types[type].class}`;
  alert.innerHTML = `
    <i class="${types[type].icon} mr-2"></i>
    <span>${message}</span>
  `;
  
  // 移除旧的提示
  const oldAlert = document.querySelector('.alert');
  if (oldAlert) oldAlert.remove();
  
  document.body.appendChild(alert);
  
  // 3秒后自动消失
  setTimeout(() => {
    alert.classList.add('fade-out');
    setTimeout(() => alert.remove(), 300);
  }, 3000);
}

async function setGlobalPassword() {
  const pwd = document.getElementById("global-password").value;
  const token = localStorage.getItem("admin_token"); // ✅修正
  if (!pwd || !token) return;

  const res = await fetch("/admin/set-global-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: pwd, token }),
  });

  const result = await res.json();
  const status = document.getElementById("global-password-status");
  if (result.success) {
    status.classList.remove("hidden");
    status.innerText = "保存成功";
  } else {
    status.classList.remove("hidden");
    status.classList.add("text-red-600");
    status.innerText = "保存失败：" + (result.error || "未知错误");
  }
}
