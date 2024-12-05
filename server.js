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
* Github: https://github.com/DennisHCL/WEB322A3.git
*
********************************************************************************/

require('dotenv').config();
const express = require("express");
const path = require("path");
const clientSessions = require('client-sessions');
const authData = require("./modules/auth-service");

const projectData = require("./modules/projects");

console.log('Starting server...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Environment variables check:');
console.log('MONGODB:', process.env.MONGODB ? 'Set' : 'Not set');
console.log('PORT:', process.env.PORT || 'Not set (using default)');

const app = express();
const HTTP_PORT = process.env.PORT || 5000; 

// Add urlencoded middleware
app.use(express.urlencoded({extended: true}));

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.use(express.static(__dirname + '/public'));

// Setup client-sessions middleware
app.use(clientSessions({
    cookieName: "session",
    secret: "web322_assignment6",
    duration: 2 * 60 * 1000,
    activeDuration: 1000 * 60
}));

// Make session data available to views
app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

// Helper middleware function
function ensureLogin(req, res, next) {
    if (!req.session.user) {
        res.redirect('/login');
    } else {
        next();
    }
}

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
app.get("/solutions/addProject",ensureLogin, (req, res) => {
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
app.post("/solutions/addProject", ensureLogin, async (req, res) => {
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
app.get("/solutions/editProject/:id", ensureLogin, async (req, res) => {
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
app.post("/solutions/editProject", ensureLogin, async (req, res) => {
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
app.get("/solutions/deleteProject/:id", ensureLogin, async (req, res) => {
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

// GET /login
app.get("/login", (req, res) => {
    res.render("login", { 
        errorMessage: "", 
        userName: "" 
    });
});

// GET /register
app.get("/register", (req, res) => {
    res.render("register", {
        errorMessage: "", 
        successMessage: "", 
        userName: ""
    });
});

// POST /register
app.post("/register", (req, res) => {
    console.log("Register route hit with data:", {
        userName: req.body.userName,
        email: req.body.email,
        // Don't log passwords
    });
    
    authData.registerUser(req.body)
        .then(() => {
            console.log("Registration successful");
            res.render("register", {
                errorMessage: "",
                successMessage: "User created",
                userName: ""
            });
        }).catch((err) => {
            console.error("Registration failed:", err);
            res.render("register", {
                errorMessage: err,
                successMessage: "",
                userName: req.body.userName
            });
        });
});

// POST /login
app.post("/login", (req, res) => {
    req.body.userAgent = req.get('User-Agent');
    
    authData.checkUser(req.body)
        .then((user) => {
            req.session.user = {
                userName: user.userName,
                email: user.email,
                loginHistory: user.loginHistory
            }
            res.redirect('/solutions/projects');
        })
        .catch((err) => {
            res.render("login", {
                errorMessage: err,
                userName: req.body.userName
            });
        });
});

// GET /logout
app.get("/logout", (req, res) => {
    req.session.reset();
    res.redirect("/");
});

// GET /userHistory
app.get("/userHistory", ensureLogin, (req, res) => {
    res.render("userHistory");
});

// 404 route (This should be the last route)
app.use((req, res) => {
    console.log("Handling 404 route");
    res.status(404).render("404", {
        message: "The page you're looking for doesn't exist"
    });
});

if (process.env.PORT) {
    console.log('Running in standard mode');
    Promise.all([
        projectData.initialize(),
        authData.initialize()
    ])
    .then(() => {
        console.log('All databases initialized');
        app.listen(HTTP_PORT, () => {
            console.log(`Server running on port ${HTTP_PORT}`);
        });
    })
    .catch((err) => {
        console.error('Server initialization failed:', err);
        process.exit(1);
    });
} else {
    console.log('Running in serverless mode');
    Promise.all([
        projectData.initialize(),
        authData.initialize()
    ])
    .then(() => {
        console.log('Serverless initialization complete');
    })
    .catch(err => {
        console.error('Serverless initialization failed:', err);
        throw err;
    });
}

module.exports = app;