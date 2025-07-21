  // 精确的时间差计算函数
  function calculateDateDiff(startDate, endDate) {
    let years = endDate.getFullYear() - startDate.getFullYear();
    let months = endDate.getMonth() - startDate.getMonth();
    let days = endDate.getDate() - startDate.getDate();
    let hours = endDate.getHours() - startDate.getHours();
    let minutes = endDate.getMinutes() - startDate.getMinutes();
    let seconds = endDate.getSeconds() - startDate.getSeconds();
    
    // 处理秒数负数
    if (seconds < 0) {
      seconds += 60;
      minutes--;
    }
    
    // 处理分钟负数
    if (minutes < 0) {
      minutes += 60;
      hours--;
    }
    
    // 处理小时负数
    if (hours < 0) {
      hours += 24;
      days--;
    }
    
    // 处理天数负数（考虑不同月份的天数差异）
    if (days < 0) {
      // 获取上个月的最后一天
      const lastDayOfMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0).getDate();
      days += lastDayOfMonth;
      months--;
    }
    
    // 处理月份负数
    if (months < 0) {
      months += 12;
      years--;
    }
    
    return { years, months, days, hours, minutes, seconds };
  }

  // 更新计时器显示
  function updateTimeCounter() {
    const startDate = new Date('2016-04-13T19:36:00');
    const now = new Date();
    const diff = calculateDateDiff(startDate, now);
    
    // 更新显示
    document.getElementById('timeCounter').textContent = 
      `在一起: ${diff.years}年 ${diff.months}月 ${diff.days}天 ${diff.hours}小时 ${diff.minutes}分 ${diff.seconds}秒`;
  }
  
  // 初始化
  document.addEventListener('DOMContentLoaded', function() {
    updateTimeCounter();
    setInterval(updateTimeCounter, 1000);
    loadPosts();
  });


    let allPosts = [];
    let page = 0;
    const pageSize = 5;
    let currentProtectedId = null;

    // 事件委托处理图片点击放大和密码访问弹窗
    document.addEventListener('click', (e) => {
      // 图片放大
      if (e.target.classList.contains('post-image')) {
        const src = e.target.getAttribute('src');
        const modal = document.createElement('div');
        modal.style.cssText = `
          position:fixed;top:0;left:0;width:100vw;height:100vh;
          background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:9999;
        `;
        modal.innerHTML = `<img src="${src}" style="max-width:90vw;max-height:90vh;border:5px solid white;">`;
        modal.onclick = () => document.body.removeChild(modal);
        document.body.appendChild(modal);
      }
      
      // 点击受保护内容弹出密码框
      if (e.target.classList.contains('post-protected')) {
        currentProtectedId = e.target.dataset.id;
        document.getElementById('passwordModal').style.display = 'flex';
      }
    });

    async function loadAllPosts() {
      const res = await fetch('/api/posts');
      allPosts = await res.json();
      renderNextPage();
    }

    function renderNextPage() {
      const container = document.getElementById('momentsContainer');
      const posts = allPosts.slice(page * pageSize, (page + 1) * pageSize);
      page++;

      posts.forEach(post => {
        const postEl = document.createElement('div');
        postEl.className = 'post';
        postEl.id = `post-${post.id}`;

        const content = post.protected
          ? `<div class="post-protected" style="color: gray; cursor: pointer;" data-id="${post.id}">此内容需要密码访问</div>`
          : `<div class="post-content">${post.content}</div>`;

        const images = !post.protected && post.images?.length
          ? `<div class="post-images">${post.images.map(img => `<img src="${img}" class="post-image" style="cursor:pointer; max-width:100px; margin-right:5px;">`).join('')}</div>`
          : '';

        postEl.innerHTML = `
          <div class="post-header">
            <img src="https://img.0413.fun/assets/j123toux.png" class="post-avatar" />
            <div>
              <div class="post-user">我</div>
              <div class="post-time">${post.date}</div>
            </div>
          </div>
          ${content}
          ${images}
        `;
        container.appendChild(postEl);
      });
    }

async function verifyPassword() {
  const password = document.getElementById('passwordInput').value;
  const hashed = await hash(password);

  const res = await fetch('/api/post/' + currentProtectedId, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password })
  });

  if (res.status === 403) {
    const data = await res.json();
    if (data.valid === false) {
      alert('密码错误');
      return;
    }
  }

  const post = await res.json();
  renderPostContent(post);
  document.getElementById('passwordModal').style.display = 'none';
}

async function hash(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function renderPostContent(post) {
  const postEl = document.getElementById('post-' + post.id);
  if (!postEl) return;

  postEl.innerHTML = `
    <div class="post-header">
      <img src="https://img.0413.fun/assets/mimi.png" class="post-avatar" />
      <div>
        <div class="post-user">我</div>
        <div class="post-time">${post.date}</div>
      </div>
    </div>
    <div class="post-content">${post.content}</div>
    ${post.images?.length ? `
      <div class="post-images">
        ${post.images.map(img => `
          <img src="${img}" class="post-image" style="cursor:pointer; max-width:100px; margin-right:5px;">
        `).join('')}
      </div>` : ''}
  `;
}

    window.onscroll = () => {
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 100) {
        renderNextPage();
      }
    };

    loadAllPosts();

  // 禁止双指缩放
  document.addEventListener('gesturestart', function (e) {
    e.preventDefault();
  });

  // 禁止双击放大（延迟300ms内的双击）
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function (e) {
    const now = new Date().getTime();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
