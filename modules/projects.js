const projectData = require("../data/projectData.json");
const sectorData = require("../data/sectorData.json");

let projects = [];

function initialize() {
    return new Promise((resolve, reject) => {
        try {
            projects = projectData.map(project => {
                const sector = sectorData.find(sector => sector.id === project.sector_id);
                return { ...project, sector: sector.sector_name };
            });
            resolve();
        } catch (error) {
            reject("Failed to initialize projects: " + error.message);
        }
    });
}

function getAllProjects() {
    return new Promise((resolve, reject) => {
        if (projects.length > 0) {
            resolve(projects);
        } else {
            reject("No projects found");
        }
    });
}

function getProjectById(projectId) {
    return new Promise((resolve, reject) => {
        const project = projects.find(project => project.id === projectId);
        if (project) {
            resolve(project);
        } else {
            reject("Unable to find requested project");
        }
    });
}

function getProjectsBySector(sector) {
    return new Promise((resolve, reject) => {
        const lowercaseSector = sector.toLowerCase();
        const filteredProjects = projects.filter(project => 
            project.sector.toLowerCase().includes(lowercaseSector)
        );
        if (filteredProjects.length > 0) {
            resolve(filteredProjects);
        } else {
            reject("Unable to find requested projects");
        }
    });
}

module.exports = { initialize, getAllProjects, getProjectById, getProjectsBySector };