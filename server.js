/********************************************************************************
*  WEB322 – Assignment 04 - EJS Implementation 
*
* I declare that this assignment is my own work in accordance with Seneca's
* Academic Integrity Policy:
*
* https://www.senecapolytechnic.ca/about/policies/academic-integrity-policy.html
*
* Name: Chin Lok Ho Student ID: 124907239 Date: 11-04-2024
*
* Published URL: Git: https://github.com/DennisHCL/WEB322A3.git
                Vercel: https://web-322-a3-gilt.vercel.app/
*
********************************************************************************/

const express = require("express");
const path = require("path");
const projectData = require("./modules/projects");

const app = express();
const HTTP_PORT = process.env.PORT || 5000; 

// Add debugging logs
console.log("Starting server setup...");

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.use(express.static(__dirname + '/public'));

// GET "/"
app.get("/", (req, res) => {
    console.log("Handling root route");
    res.render("home");
});

// GET "/about"
app.get("/about", (req, res) => {
    console.log("Handling about route");
    res.render("about");
});

// GET "/solutions/projects"
app.get("/solutions/projects", (req, res) => {
    console.log("Handling projects route");
    const sector = req.query.sector;
    if (sector) {
        projectData.getProjectsBySector(sector)
            .then(projects => {
                res.render("projects", { projects: projects });
            })
            .catch(err => {
                res.status(404).render("404", {
                    message: `No projects found for sector: ${sector}`
                });
            });
    } else {
        projectData.getAllProjects()
            .then(projects => {
                res.render("projects", { projects: projects });
            })
            .catch(err => {
                res.status(404).render("404", {
                    message: "Unable to load projects"
                });
            });
    }
});

// GET "/solutions/projects/:id"
app.get("/solutions/projects/:id", (req, res) => {
    console.log("Handling single project route");
    const id = parseInt(req.params.id);
    projectData.getProjectById(id)
        .then(project => {
            res.render("project", { project: project });
        })
        .catch(err => {
            res.status(404).render("404", {
                message: `Project not found for ID: ${id}`
            });
        });
});

// 404 route
app.use((req, res) => {
    console.log("Handling 404 route");
    res.status(404).render("404", {
        message: "The page you're looking for doesn't exist"
    });
});

// Initialize and start server with better error handling
projectData.initialize()
    .then(() => {
        app.listen(HTTP_PORT, () => {
            console.log(`Server is running and listening on port ${HTTP_PORT}`);
            console.log(`Visit http://localhost:${HTTP_PORT} to view the application`);
        });
    })
    .catch((err) => {
        console.error(`Failed to start server: ${err}`);
        process.exit(1); // Exit the process if initialization fails
    });