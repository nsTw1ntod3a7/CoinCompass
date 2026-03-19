const firebaseConfig = {
  apiKey: "AIzaSyDUKNKvSuoPYrCe7d6Xnc8rIdfq7ZMVf2k",
  authDomain: "coincompass-hack.firebaseapp.com",
  projectId: "coincompass-hack",
  storageBucket: "coincompass-hack.firebasestorage.app",
  messagingSenderId: "972639367478",
  appId: "1:972639367478:web:49ce98b93c2cabd3250397",
  databaseURL: "https://coincompass-hack-default-rtdb.europe-west1.firebasedatabase.app"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

let expenses = [];
let chart = null;
let editingId = null;
let currentUser = null;

// Наблюдатель за состоянием входа
auth.onAuthStateChanged(user => {
    if(user) {
        currentUser = user;
        document.getElementById("loginSection").style.display = "none";
        document.getElementById("mainApp").style.display = "block";
        document.getElementById("mainNav").style.display = "flex";
        document.getElementById("logoutBtn").style.display = "block";
        loadExpenses();
    } else {
        currentUser = null;
        document.getElementById("loginSection").style.display = "block";
        document.getElementById("mainApp").style.display = "none";
        document.getElementById("mainNav").style.display = "none";
        document.getElementById("logoutBtn").style.display = "none";
    }
});

function login(){
    const email = document.getElementById("loginEmail").value;
    const pass = document.getElementById("loginPassword").value;
    auth.signInWithEmailAndPassword(email, pass)
    .catch(err => notify("Ошибка входа: " + err.message));
}

function register(){
    const email = document.getElementById("loginEmail").value;
    const pass = document.getElementById("loginPassword").value;
    auth.createUserWithEmailAndPassword(email, pass)
    .catch(err => notify("Ошибка регистрации: " + err.message));
}

function logout(){
    auth.signOut();
}

function loadExpenses(){
    db.ref("users/" + currentUser.uid + "/expenses").on("value", (snapshot) => {
        const data = snapshot.val();
        expenses = data ? Object.keys(data).map(key => ({...data[key], firebaseId: key})) : [];
        render();
    });
}

function notify(text){
    let n=document.getElementById("notify")
    n.innerText=text
    n.classList.add("show")
    setTimeout(()=>{n.classList.remove("show")},2000)
}

function tab(id,btn){
    document.querySelectorAll(".section").forEach(s=>s.classList.remove("active"))
    document.getElementById(id).classList.add("active")
    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"))
    btn.classList.add("active")
    render();
}

function saveExpense(){
    if(!currentUser) return;
    let amount=document.getElementById("amount")
    let category=document.getElementById("category")
    let desc=document.getElementById("desc")

    if(!amount.value) return;

    const expenseData = {
        amount: Number(amount.value),
        category: category.value,
        desc: desc.value || "-",
        date: editingId ? expenses.find(e => e.firebaseId === editingId).date : new Date().toISOString()
    };

    const ref = db.ref("users/" + currentUser.uid + "/expenses");
    if(editingId) {
        ref.child(editingId).update(expenseData);
        notify("Обновлено");
        resetForm();
    } else {
        ref.push(expenseData);
        notify("Сохранено");
    }

    amount.value=""
    desc.value=""
}

function editEntry(id){
    const item = expenses.find(e => e.firebaseId === id);
    if(!item) return;
    editingId = id;
    document.getElementById("amount").value = item.amount;
    document.getElementById("category").value = item.category;
    document.getElementById("desc").value = item.desc;
    document.getElementById("formTitle").innerText = "Редактировать расход";
    document.getElementById("submitBtn").innerText = "Обновить запись";
    document.getElementById("cancelBtn").style.display = "block";
    tab('add', document.querySelector('.tab[onclick*="add"]'));
}

function resetForm() {
    editingId = null;
    document.getElementById("amount").value = "";
    document.getElementById("desc").value = "";
    document.getElementById("formTitle").innerText = "Добавить расход";
    document.getElementById("submitBtn").innerText = "Сохранить расход";
    document.getElementById("cancelBtn").style.display = "none";
}

function del(firebaseId){
    if(confirm("Удалить запись?")) {
        db.ref("users/" + currentUser.uid + "/expenses/" + firebaseId).remove();
        notify("Удалено");
    }
}

function render(){
    renderHistory();
    renderStats();
    renderMonths();
}

function renderHistory(){
    let html=""
    expenses.slice().reverse().forEach(e=>{
        let date=new Date(e.date).toLocaleDateString()
        html += `<tr>
            <td>${date}</td>
            <td>${e.category}</td>
            <td>${e.amount} ₽</td>
            <td>${e.desc}</td>
            <td>
                <button class="edit-btn" onclick="editEntry('${e.firebaseId}')">Изменить</button>
                <button class="delete-btn" onclick="del('${e.firebaseId}')">Удалить</button>
            </td>
        </tr>`;
    })
    document.getElementById("historyBody").innerHTML = html;
}

function renderStats(){
    let total=0; let cats={};
    expenses.forEach(e=>{
        total += e.amount;
        cats[e.category] = (cats[e.category] || 0) + e.amount;
    });
    document.getElementById("total").innerText = total + " ₽";
    document.getElementById("count").innerText = expenses.length;
    let ctx = document.getElementById("chart");
    if(chart) chart.destroy();
    if(expenses.length > 0) {
        chart = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: Object.keys(cats),
                datasets: [{ 
                    data: Object.values(cats),
                    backgroundColor: ['#4b6cff', '#ff4b4b', '#ffb84b', '#2ecc71', '#9b59b6', '#34495e']
                }]
            },
            options: { maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }
        });
    }
}

function renderMonths(){
    let months={};
    expenses.forEach(e=>{
        let m = new Date(e.date).toLocaleString("ru",{month:"long",year:"numeric"});
        months[m] = (months[m] || 0) + e.amount;
    });
    let html="";
    for(let m in months){
        html += `<tr><td>${m}</td><td>${months[m]} ₽</td></tr>`;
    }
    document.getElementById("monthBody").innerHTML = html;
}

function exportData(){
    const data = JSON.stringify(expenses);
    const blob = new Blob([data],{type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "coincompass_backup.json";
    a.click();
}
