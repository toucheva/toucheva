// ============ ฟาร์มมินิ — เควส (เรียงลำดับ เปิดทีละข้อ) ============
(() => {
  // เช็คเฉพาะเควสถัดไปที่ยังไม่ได้ทำ (questsDone เก็บ id เรียงกัน)
  // คืน array ของเควสที่เพิ่งสำเร็จ (อาจมีหลายข้อถ้าเงื่อนไขทำให้พร้อมกัน)
  function checkQuests(state) {
    const D = window.Farm.DATA;
    const doneIds = new Set(state.questsDone.map(q => q.id || q));
    const completed = [];
    for (const q of D.QUESTS) {
      if (doneIds.has(q.id)) continue;
      if (q.test(state)) {
        state.money += q.reward;
        if (q.xp) window.Farm.addXp(state, q.xp);
        state.questsDone.push({ id: q.id, desc: q.desc, reward: q.reward, day: state.day });
        window.Farm.pushNews(state, `✅ เควสสำเร็จ: ${q.desc} (+${q.reward}🪙)`);
        completed.push(q);
      } else {
        break; // ทำข้อนี้ไม่เสร็จ เควสถัดไปยังไม่เปิด
      }
    }
    return completed;
  }

  function currentQuest(state) {
    const D = window.Farm.DATA;
    const doneIds = new Set(state.questsDone.map(q => q.id || q));
    return D.QUESTS.find(q => !doneIds.has(q.id)) || null;
  }

  window.Farm = window.Farm || {};
  Object.assign(window.Farm, { checkQuests, currentQuest });
})();