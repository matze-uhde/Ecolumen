let jiraUrl;
let gadgetUrl;

async function fetchJiraUrl() {
    try {
        const response = await fetch('/api/jira-url');
        const data = await response.json();
        jiraUrl = data.url;
        console.log('Fetched Jira URL:', jiraUrl);
    } catch (error) {
        console.error('Error fetching Jira URL:', error.message);
    }
}

async function fetchGadgetUrl() {
    try {
        const response = await fetch('/api/gadget-url');
        const data = await response.json();
        gadgetUrl = data.url;
        console.log('Fetched Gadget URL:', gadgetUrl);
    } catch (error) {
        console.error('Error fetching Gadget URL:', error.message);
    }
}

async function loadProjects() {
    if (!jiraUrl) {
        await fetchJiraUrl();
    }
    if (!gadgetUrl) {
        await fetchGadgetUrl();
    }
    console.log('Using Jira URL:', jiraUrl);
    console.log('Using Gadget URL:', gadgetUrl);

    const projectList = document.getElementById('project-list');
    projectList.innerHTML = '<li>Loading projects...</li>';

    try {
        await initAP();
        const response = await AP.request('/rest/api/2/project');
        const projects = JSON.parse(response.body);
        console.log(`Received ${projects.length} projects`);

        // Erstellen Sie einen table-container und fügen Sie ihn dem projectList hinzu
        projectList.innerHTML = '<div class="table-container"><table id="projects-table"></table></div>';
        const projectsTable = document.getElementById('projects-table');

        for (const project of projects) {
            console.log(`Processing project: ${project.name} (${project.key})`);
            
            const lead = await getProjectLead(project.id);
            const iframeUrl = `${jiraUrl}/jira/core/projects/${project.key}/board`;
            const ecoworksUrl = `${gadgetUrl}/eco/buildings.html?projectKey=${project.key}`;

            const tr = document.createElement('tr');
            tr.className = 'project-item';
            tr.innerHTML = `
                <td><img src="${project.avatarUrls['24x24']}" alt="${project.name} Icon" class="project-avatar"></td>
                <td>
                    <span class="project-info">
                        <span class="project-name">${project.name}</span>
                        <span class="project-lead">Lead: ${lead}</span>
                        <span class="project-key">Key: ${project.key}</span>
                    </span>
                </td>
                <td>
                    <a href="${iframeUrl}" target="_blank"><img src="images/jira_logo.png" alt="Jira" class="logo-icon"></a>
                </td>
                <td>
                    <a href="${ecoworksUrl}"><img src="images/ecoworks.png" alt="Ecoworks" class="logo-icon"></a>
                </td>
            `;
            projectsTable.appendChild(tr);
        }
        console.log('All projects added to the table');

        if (AP.resize) {
            AP.resize();
        }
    } catch (error) {
        console.error('Error in loadProjects:', error);
        projectList.innerHTML = '<li>Error loading projects. Please try again later.</li>';
    }
}

async function getProjectLead(projectId) {
    try {
        const response = await AP.request(`/rest/api/2/project/${projectId}`);
        const projectDetails = JSON.parse(response.body);
        return projectDetails.lead.displayName;
    } catch (error) {
        console.error('Error fetching project lead:', error);
        return 'Unknown';
    }
}

async function initAP() {
    return new Promise((resolve) => {
        if (window.AP && AP.request) {
            resolve();
        } else {
            const script = document.createElement('script');
            script.src = 'https://connect-cdn.atl-paas.net/all.js';
            script.onload = function() {
                console.log('Atlassian Connect script loaded');
                AP.require(['request'], resolve);
            };
            document.head.appendChild(script);
        }
    });
}

async function getCurrentUser() {
    try {
        const response = await AP.request('/rest/api/3/myself');
        const user = JSON.parse(response.body);
        return user.accountId;
    } catch (error) {
        console.error('Error getting current user:', error.message);
        throw error;
    }
}

async function getNextProjectKey() {
    try {
        const response = await AP.request('/rest/api/3/project');
        const projects = JSON.parse(response.body);
        
        let maxNumber = 0;
        projects.forEach(project => {
            if (project.key.startsWith('ECO')) {
                const num = parseInt(project.key.substring(3));
                if (!isNaN(num) && num > maxNumber) {
                    maxNumber = num;
                }
            }
        });
        
        return `ECO${(maxNumber + 1).toString().padStart(4, '0')}`;
    } catch (error) {
        console.error('Error getting next project key:', error.message);
        throw error;
    }
}

async function createNewProject() {
    try {
        await initAP();

        const projectName = prompt("Bitte geben Sie den Namen des neuen Projekts ein:", "Neuer Ecolumen Auftrag");
        
        if (!projectName) {
            console.log('Projekt-Erstellung vom Benutzer abgebrochen.');
            return;
        }

        const leadAccountId = await getCurrentUser();
        const projectKey = await getNextProjectKey();
        const projectData = window.createProjectTemplate(projectKey, leadAccountId, projectName);

        console.log('Erstelle neues Projekt...');
        const response = await AP.request({
            url: '/rest/api/3/project',
            type: 'POST',
            data: JSON.stringify(projectData),
            contentType: 'application/json'
        });

        const newProject = JSON.parse(response.body);
        console.log(`Neues Projekt erstellt: ${newProject.name} (${newProject.key})`);
        alert(`Neuer Auftrag wurde erstellt: ${newProject.name} (${newProject.key})`);
        
        await loadProjects();
    } catch (error) {
        console.error('Fehler bei der Erstellung eines neuen Projekts:', error);
        if (error.xhr) {
            console.error('XHR-Status:', error.xhr.status);
            console.error('XHR-Antwort:', error.xhr.responseText);
        }
        alert(`Fehler beim Erstellen des neuen Projekts: ${error.message}`);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await fetchJiraUrl();
    await fetchGadgetUrl();
    loadProjects();
});

const newProjectBtn = document.getElementById('newProjectBtn');
if (newProjectBtn) {
    newProjectBtn.addEventListener('click', createNewProject);
}

console.log('main.js script loaded and parsed');