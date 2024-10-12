/********************************************************************************
* WEB322 – Assignment 03
*
* I declare that this assignment is my own work in accordance with Seneca's
* Academic Integrity Policy:
*
* https://www.senecapolytechnic.ca/about/policies/academic-integrity-policy.html
*
* Name: Chin Lok Ho Student ID: 124907239 Date: 10-11-2024
*
********************************************************************************/

const express = require("express");
const path = require("path");
const projectData = require("./modules/projects");

const app = express();
const HTTP_PORT = process.env.PORT || 8080;

app.use(express.static('public'));

// GET "/"
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "/views/home.html"));
});

// GET "/about"
app.get("/about", (req, res) => {
    res.sendFile(path.join(__dirname, "/views/about.html"));
});

// GET "/solutions/projects"
app.get("/solutions/projects", (req, res) => {
    const sector = req.query.sector;
    if (sector) {
        projectData.getProjectsBySector(sector)
            .then(projects => res.json(projects))
            .catch(err => res.status(404).json({ error: err }));
    } else {
        projectData.getAllProjects()
            .then(projects => res.json(projects))
            .catch(err => res.status(404).json({ error: err }));
    }
});

// GET "/solutions/projects/:id"
app.get("/solutions/projects/:id", (req, res) => {
    const id = parseInt(req.params.id);
    projectData.getProjectById(id)
        .then(project => res.json(project))
        .catch(err => res.status(404).json({ error: err }));
});

// 404 route
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, "/views/404.html"));
});

projectData.initialize().then(() => {
    app.listen(HTTP_PORT, () => {
        console.log(`Server listening on port ${HTTP_PORT}`);
    });
}).catch((err) => {
    console.log(`Failed to start server: ${err}`);
});