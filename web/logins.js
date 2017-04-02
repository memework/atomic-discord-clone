function login() {
    $.post("/api/auth/login", { email: document.getElementById("email").value, password: document.getElementById("password").value }, function (result) {
        window.localStorage.setItem("token", result.token)
    });
}

function signup() {
    $.post("/api/users/add", { email: document.getElementById("email"), username: document.getElementById("username"), password: document.getElementById("password") }, function (result) {
        window.localStorage.setItem("token", result.token)
    });
}