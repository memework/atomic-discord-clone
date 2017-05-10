let APIBase = "" // "http://0.0.0.0:8000"

$(document).ready(function() {
    document.getElementById("login").onclick = login
})

function login() {
    console.log("Henlo")
    $.post(APIBase + "/api/auth/login", JSON.stringify({ email: document.getElementById("email").value, password: document.getElementById("password").value }), function (result) {
        window.localStorage.setItem("token", JSON.parse(result).token)
        window.location.href = "serverview.html"
    });
}

function signup() {
    $.post(APIBase + "/api/users/add", JSON.stringify({ email: document.getElementById("email"), username: document.getElementById("username"), password: document.getElementById("password") }), function (result) {
        result = JSON.parse(result)
        if (result.code != 1 || result.message != "success") return alert(new Error("An error occurred while signing you up :( Error " + result.code + ": " + result.message))
        login()
    });
}