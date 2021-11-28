function load_text(name) {
    var url = name
    var request = new XMLHttpRequest();
    request.open("get", url);
    request.send(null);
    request.onload = function () {
        if (request.status == 200) {
            var text = request.responseText;
            document.getElementById('content').innerHTML = marked.parse(text);
            hash = window.location.hash;
            window.location.hash = ""
            window.location.hash = hash;
        }
    }
    
}
