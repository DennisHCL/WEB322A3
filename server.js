/********************************************************************************
*  WEB322 – Assignment 05
*
* I declare that this assignment is my own work in accordance with Seneca's
* Academic Integrity Policy:
*
* https://www.senecapolytechnic.ca/about/policies/academic-integrity-policy.html
*
* Name: Chin Lok Ho Student ID: 124907239 Date: 11-18-2024
*
* Published URL: https://web-322-a3-gilt.vercel.app/
*
********************************************************************************/

require('dotenv').config();
const express = require("express");
const path = require("path");

const projectData = require("./modules/projects");

const app = express();
const HTTP_PORT = process.env.PORT || 5000; 

// Add urlencoded middleware
app.use(express.urlencoded({extended: true}));

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

// GET "/solutions/addProject"
app.get("/solutions/addProject", (req, res) => {
    console.log("Handling add project route");
    projectData.getAllSectors()
        .then(sectors => {
            res.render("addProject", { sectors: sectors });
        })
        .catch(err => {
            console.error("Error in addProject route:", err);
            res.render("500", { 
                message: `I'm sorry, but we have encountered the following error: ${err}` 
            });
        });
});

// POST "/solutions/addProject"
app.post("/solutions/addProject", async (req, res) => {
    console.log("Handling POST add project route");
    console.log("Form data received:", req.body);
    
    try {
        const formData = {
            title: req.body.title,
            feature_img_url: req.body.feature_img_url,
            sector_id: parseInt(req.body.sector_id),
            intro_short: req.body.intro_short,
            summary_short: req.body.summary_short,
            impact: req.body.impact,
            original_source_url: req.body.original_source_url
        };

        console.log("Processed form data:", formData);

        await projectData.addProject(formData);
        console.log("Project added successfully");
        res.redirect("/solutions/projects");
    } catch (err) {
        console.error("Error in POST addProject:", err);
        res.render("500", {
            message: `I'm sorry, but we have encountered the following error: ${err}`
        });
    }
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
                console.error("Error in projects route (sector):", err);
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
                console.error("Error in projects route:", err);
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
            console.error("Error in single project route:", err);
            res.status(404).render("404", {
                message: `Project not found for ID: ${id}`
            });
        });
});

// GET /solutions/editProject/:id
app.get("/solutions/editProject/:id", async (req, res) => {
    console.log("Handling edit project route");
    try {
        const projectId = parseInt(req.params.id);
        const [project, sectors] = await Promise.all([
            projectData.getProjectById(projectId),
            projectData.getAllSectors()
        ]);
        
        res.render("editProject", { 
            project: project, 
            sectors: sectors 
        });
    } catch (err) {
        console.error("Error in edit project route:", err);
        res.status(404).render("404", { 
            message: err
        });
    }
});

// POST /solutions/editProject
app.post("/solutions/editProject", async (req, res) => {
    console.log("Handling POST edit project route");
    console.log("Edit form data received:", req.body);
    try {
        const id = parseInt(req.body.id);
        await projectData.editProject(id, req.body);
        console.log("Project updated successfully");
        res.redirect("/solutions/projects");
    } catch (err) {
        console.error("Error in POST edit project:", err);
        res.render("500", { 
            message: `I'm sorry, but we have encountered the following error: ${err}`
        });
    }
});

// GET /solutions/deleteProject/:id
app.get("/solutions/deleteProject/:id", async (req, res) => {
    console.log("Handling delete project route");
    try {
        const id = parseInt(req.params.id);
        await projectData.deleteProject(id);
        console.log("Project deleted successfully");
        res.redirect("/solutions/projects");
    } catch (err) {
        console.error("Error in delete project route:", err);
        res.render("500", { 
            message: `I'm sorry, but we have encountered the following error: ${err}`
        });
    }
});

// 404 route (This should be the last route)
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