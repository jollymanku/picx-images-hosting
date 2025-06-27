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
