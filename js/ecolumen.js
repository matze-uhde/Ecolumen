AP.context.getContext(function(context) {
    var container = document.getElementById('ecolumen-container');
    
    if (context && context.jira) {
        container.innerHTML += '<p>Jira Base URL: ' + context.jira.baseUrl + '</p>';
        // Hier können Sie weitere Jira-Kontextinformationen hinzufügen oder mit der Ecolumen-Integration beginnen
    } else {
        container.innerHTML += '<p>Unable to retrieve Jira context.</p>';
    }
});