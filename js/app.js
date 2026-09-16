const { createApp, ref, reactive, computed, onMounted } = Vue;

createApp({
  setup() {
    function getTodayString() {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    function getNextDayString(dateStr) {
      const target = dateStr || getTodayString();
      const [y, m, d] = target.split('-').map(Number);
      const next = new Date(y, m - 1, d + 1);
      const ny = next.getFullYear();
      const nm = String(next.getMonth() + 1).padStart(2, '0');
      const nd = String(next.getDate()).padStart(2, '0');
      return `${ny}-${nm}-${nd}`;
    }

    function formatDateWithWeekday(dateStr) {
      if (!dateStr) return '';
      const [year, month, day] = dateStr.split('-');
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
      return `${year} 年 ${Number(month)} 月 ${Number(day)} 日（${weekdays[d.getDay()]}）`;
    }

    const appConfig = window.APP_CONFIG || {};
    const classTitle = ref(appConfig.classTitle || '班級聯絡簿');
    const cachedInitial = FirebaseSync.getCachedData();
    const records = ref(cachedInitial);
    const currentDate = ref(getTodayString());
    const viewMode = ref('daily');
    const isLoading = ref(false);
    const isCloudConnected = ref(false);
    const isSaving = ref(false);
    const isEditMode = ref(true); // 常態編輯模式
    const hasFirebaseConfig = computed(() => Boolean(appConfig.firebaseDatabaseUrl && appConfig.firebaseDatabaseUrl.trim()));

    const toast = reactive({
      show: false,
      message: '',
      type: 'info',
      timer: null
    });

    function showToast(message, type = 'info') {
      toast.message = message;
      toast.type = type;
      toast.show = true;
      if (toast.timer) clearTimeout(toast.timer);
      toast.timer = setTimeout(() => {
        toast.show = false;
      }, 3000);
    }

    function getDaysDiff(fromDateStr, toDateStr) {
      if (!fromDateStr || !toDateStr) return null;
      const [y1, m1, d1] = fromDateStr.split('-').map(Number);
      const [y2, m2, d2] = toDateStr.split('-').map(Number);
      const dFrom = new Date(y1, m1 - 1, d1);
      const dTo = new Date(y2, m2 - 1, d2);
      const diffTime = dTo.getTime() - dFrom.getTime();
      return Math.round(diffTime / (1000 * 60 * 60 * 24));
    }

    function getItemDeadlineInfo(item, targetDate) {
      if (!item || !item.dueDate) return null;
      const diff = getDaysDiff(targetDate, item.dueDate);
      if (diff === null) return null;

      const isContinuing = Boolean(item.date && item.date < targetDate);
      const currentYear = targetDate ? targetDate.slice(0, 4) : new Date().getFullYear().toString();
      const shortDueDate = item.dueDate.startsWith(currentYear + '-')
        ? item.dueDate.slice(5)
        : item.dueDate;

      if (diff === 1) {
        return {
          status: 'tomorrow',
          daysLeft: 1,
          badgeText: `明日截止 (${shortDueDate})`,
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse',
          isContinuing
        };
      }
      if (diff === 0) {
        return {
          status: 'today',
          daysLeft: 0,
          badgeText: `今日到期 (${shortDueDate})`,
          badgeClass: 'bg-rose-600 text-white border-rose-700 font-extrabold shadow-sm',
          isContinuing
        };
      }
      if (diff < 0) {
        return {
          status: 'overdue',
          daysLeft: diff,
          badgeText: `已逾期 (${shortDueDate})`,
          badgeClass: 'bg-slate-200 text-slate-700 border-slate-300 font-medium',
          isContinuing
        };
      }
      if (diff <= 3) {
        return {
          status: 'soon',
          daysLeft: diff,
          badgeText: `${diff}天後截止 (${shortDueDate})`,
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
          isContinuing
        };
      }
      return {
        status: 'normal',
        daysLeft: diff,
        badgeText: `截止日: ${shortDueDate}`,
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
        isContinuing
      };
    }

    const currentRecords = computed(() => {
      if (viewMode.value === 'all') {
        return [...records.value].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      }
      const target = currentDate.value;
      return records.value.filter((item) => {
        if (item.date === target) return true;
        if (item.date && item.date < target && item.dueDate && item.dueDate >= target) {
          return true;
        }
        return false;
      });
    });

    const homeworkItems = computed(() => currentRecords.value.filter((r) => r.category === 'homework'));
    const examItems = computed(() => currentRecords.value.filter((r) => r.category === 'exam'));
    const submissionItems = computed(() => currentRecords.value.filter((r) => r.category === 'submission'));
    const reminderItems = computed(() => currentRecords.value.filter((r) => r.category === 'reminder'));
    const isToday = computed(() => currentDate.value === getTodayString());

    function changeDay(delta) {
      const [y, m, d] = currentDate.value.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      date.setDate(date.getDate() + delta);
      const newY = date.getFullYear();
      const newM = String(date.getMonth() + 1).padStart(2, '0');
      const newD = String(date.getDate()).padStart(2, '0');
      currentDate.value = `${newY}-${newM}-${newD}`;
    }

    function goToday() {
      currentDate.value = getTodayString();
    }

    function openDatePicker() {
      const dateInput = document.getElementById('mainDatePickerInput');
      if (dateInput) {
        if (typeof dateInput.showPicker === 'function') {
          try {
            dateInput.showPicker();
            return;
          } catch (e) {}
        }
        dateInput.focus();
        dateInput.click();
      }
    }

    // 表單彈窗管理
    const showEditModal = ref(false);
    const isEditingExisting = ref(false);
    const formItem = reactive({
      id: '',
      date: getTodayString(),
      category: 'homework',
      subject: '',
      title: '',
      details: '',
      dueDate: getNextDayString(getTodayString())
    });

    function openAddModal(category = 'homework') {
      isEditingExisting.value = false;
      formItem.id = '';
      formItem.date = currentDate.value || getTodayString();
      formItem.category = category;
      formItem.subject = '';
      formItem.title = '';
      formItem.details = '';
      formItem.dueDate = getNextDayString(formItem.date);
      showEditModal.value = true;
    }

    function openEditModal(item) {
      isEditingExisting.value = true;
      formItem.id = item.id;
      formItem.date = item.date;
      formItem.category = item.category;
      formItem.subject = item.subject || '';
      formItem.title = item.title || '';
      formItem.details = item.details || '';
      formItem.dueDate = item.dueDate || '';
      showEditModal.value = true;
    }

    async function submitItemForm() {
      if (!formItem.title.trim()) {
        showToast('請填寫項目名稱或內容', 'error');
        return;
      }

      const updatedList = [...records.value];
      if (isEditingExisting.value) {
        const idx = updatedList.findIndex((r) => r.id === formItem.id);
        if (idx !== -1) {
          updatedList[idx] = { ...formItem };
        }
      } else {
        const newItem = {
          ...formItem,
          id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          created_at: new Date().toISOString()
        };
        updatedList.unshift(newItem);
      }

      // 樂觀更新：立即更新畫面並關閉彈窗
      records.value = updatedList;
      showEditModal.value = false;
      showToast('儲存中...', 'info');

      isSaving.value = true;
      try {
        const res = await FirebaseSync.saveData(updatedList);
        if (res.success) {
          showToast(res.source === 'firebase' ? '儲存成功，已即時同步至雲端！' : '已儲存至本機', 'success');
        } else {
          showToast('雲端同步警告：' + (res.error || '已暫存於本機'), 'error');
        }
      } catch (err) {
        showToast('儲存失敗：' + err.message, 'error');
      } finally {
        isSaving.value = false;
      }
    }

    async function deleteItem(item) {
      if (!confirm(`確定要刪除「${item.title}」嗎？`)) return;

      const updatedList = records.value.filter((r) => {
        if (item.id && r.id) return r.id !== item.id;
        return !(r.title === item.title && r.category === item.category && r.date === item.date);
      });
      records.value = updatedList;
      showToast('刪除中...', 'info');

      isSaving.value = true;
      try {
        const res = await FirebaseSync.saveData(updatedList);
        if (res.success) {
          showToast(res.source === 'firebase' ? '項目已刪除並即時同步！' : '項目已從本機刪除', 'info');
        } else {
          showToast('刪除警告：' + (res.error || '無法同步雲端'), 'error');
        }
      } catch (err) {
        showToast('刪除失敗：' + err.message, 'error');
      } finally {
        isSaving.value = false;
      }
    }

    onMounted(() => {
      // 1. 只有在完全未配置 Firebase 且本機無任何快取時，才讀取 records.json 作為初始範例
      if (!hasFirebaseConfig.value && records.value.length === 0 && !localStorage.getItem(FirebaseSync.LOCAL_STORAGE_KEY)) {
        fetch('data/records.json')
          .then((res) => res.json())
          .then((data) => {
            if (records.value.length === 0) {
              const list = Array.isArray(data.records) ? data.records : (Array.isArray(data) ? data : []);
              if (list.length > 0) {
                records.value = FirebaseSync.normalizeRecords(list);
              }
            }
          })
          .catch(() => {});
      }

      // 2. 初始化 Firebase 即時監聽
      FirebaseSync.init({
        onUpdate: (updatedRecords) => {
          records.value = updatedRecords;
          const dates = updatedRecords.map((r) => r.date).filter(Boolean).sort();
          if (!updatedRecords.some((r) => r.date === currentDate.value) && dates.length > 0) {
            const latestDate = dates[dates.length - 1];
            if (latestDate > currentDate.value) {
              currentDate.value = latestDate;
            }
          }
        },
        onStatusChange: (connected) => {
          isCloudConnected.value = connected;
        }
      });
    });

    return {
      classTitle,
      records,
      currentDate,
      viewMode,
      isLoading,
      isCloudConnected,
      hasFirebaseConfig,
      isSaving,
      isEditMode,
      toast,
      showToast,
      isToday,
      changeDay,
      goToday,
      openDatePicker,
      formatDateWithWeekday,
      getItemDeadlineInfo,
      homeworkItems,
      examItems,
      submissionItems,
      reminderItems,
      showEditModal,
      isEditingExisting,
      formItem,
      openAddModal,
      openEditModal,
      submitItemForm,
      deleteItem
    };
  }
}).mount('#app');
