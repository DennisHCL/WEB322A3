// Add required module imports at the top
require('dotenv').config();
require('pg');
const Sequelize = require('sequelize');

// Create Sequelize instance with direct connection string
const sequelize = new Sequelize('postgresql://web322-a5_owner:eAfYkCWb0z2I@ep-restless-sun-a4gm7mas.us-east-1.aws.neon.tech/web322-a5', {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    logging: console.log
});

// Test the connection
sequelize.authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });

// Define Sector model
const Sector = sequelize.define('Sector', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    sector_name: Sequelize.STRING
}, {
    timestamps: false
});

// Define Project model with updated configuration
const Project = sequelize.define('Project', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    title: {
        type: Sequelize.STRING,
        allowNull: false
    },
    feature_img_url: {
        type: Sequelize.STRING,
        allowNull: false
    },
    summary_short: {
        type: Sequelize.TEXT,
        allowNull: false
    },
    intro_short: {
        type: Sequelize.TEXT,
        allowNull: false
    },
    impact: {
        type: Sequelize.TEXT,
        allowNull: false
    },
    original_source_url: {
        type: Sequelize.STRING,
        allowNull: false
    },
    sector_id: {
        type: Sequelize.INTEGER,
        allowNull: false
    }
}, {
    timestamps: false,
    tableName: 'Projects'
});

// Define relationship
Project.belongsTo(Sector, { foreignKey: 'sector_id' });

// Function to reset sequence
async function resetSequence() {
    try {
        // Find the maximum id currently in the Projects table
        const result = await sequelize.query(
            "SELECT MAX(id) FROM \"Projects\"",
            { type: sequelize.QueryTypes.SELECT }
        );
        
        const maxId = result[0].max || 0;
        
        // Reset the sequence to start from after the maximum id
        await sequelize.query(
            `ALTER SEQUENCE "Projects_id_seq" RESTART WITH ${maxId + 1};`
        );
        
        console.log("Sequence reset successfully");
    } catch (error) {
        console.error("Error resetting sequence:", error);
    }
}

// Initialize function with sequence reset
async function initialize() {
    try {
        await sequelize.sync();
        await resetSequence();
        return Promise.resolve();
    } catch (err) {
        return Promise.reject(err);
    }
}

// Get all projects
function getAllProjects() {
    return new Promise((resolve, reject) => {
        Project.findAll({
            include: [Sector]
        })
            .then(projects => {
                if (projects.length > 0) {
                    const formattedProjects = projects.map(project => ({
                        ...project.dataValues,
                        sector: project.Sector.sector_name
                    }));
                    resolve(formattedProjects);
                } else {
                    reject("No projects found");
                }
            })
            .catch(err => reject(err));
    });
}

// Get project by ID
function getProjectById(projectId) {
    return new Promise((resolve, reject) => {
        Project.findAll({
            include: [Sector],
            where: {
                id: projectId
            }
        })
            .then(projects => {
                if (projects.length > 0) {
                    const project = projects[0];
                    resolve({
                        ...project.dataValues,
                        sector: project.Sector.sector_name
                    });
                } else {
                    reject("Unable to find requested project");
                }
            })
            .catch(err => reject(err));
    });
}

// Get projects by sector
function getProjectsBySector(sector) {
    return new Promise((resolve, reject) => {
        Project.findAll({
            include: [Sector],
            where: {
                '$Sector.sector_name$': {
                    [Sequelize.Op.iLike]: `%${sector}%`
                }
            }
        })
            .then(projects => {
                if (projects.length > 0) {
                    const formattedProjects = projects.map(project => ({
                        ...project.dataValues,
                        sector: project.Sector.sector_name
                    }));
                    resolve(formattedProjects);
                } else {
                    reject("Unable to find requested projects");
                }
            })
            .catch(err => reject(err));
    });
}

// Get all sectors
function getAllSectors() {
    return new Promise((resolve, reject) => {
        Sector.findAll()
            .then(sectors => {
                resolve(sectors);
            })
            .catch(err => reject(err));
    });
}

// Updated addProject function
function addProject(projectData) {
    return new Promise(async (resolve, reject) => {
        try {
            // Validate sector_id
            if (!projectData.sector_id || isNaN(projectData.sector_id)) {
                throw new Error("Invalid sector_id");
            }

            // Ensure we don't have an id in the projectData
            delete projectData.id;

            // Parse sector_id as integer
            projectData.sector_id = parseInt(projectData.sector_id);

            // Create the project
            await Project.create(projectData);
            resolve();
        } catch (err) {
            console.error("Error in addProject:", err);
            if (err.errors && err.errors.length > 0) {
                reject(err.errors[0].message);
            } else {
                reject(err.message || "Unable to create project");
            }
        }
    });
}

function editProject(id, projectData) {
    return new Promise(async (resolve, reject) => {
        try {
            // Validate sector_id
            if (!projectData.sector_id || isNaN(projectData.sector_id)) {
                throw new Error("Invalid sector_id");
            }

            // Parse sector_id as integer
            projectData.sector_id = parseInt(projectData.sector_id);

            // Find the project
            const project = await Project.findByPk(id);
            
            if (!project) {
                throw new Error("Project not found");
            }

            // Update the project
            await project.update(projectData);
            
            resolve();
        } catch (err) {
            console.error("Error in editProject:", err);
            if (err.errors && err.errors.length > 0) {
                reject(err.errors[0].message);
            } else {
                reject(err.message || "Unable to update project");
            }
        }
    });
}

function deleteProject(id) {
    return new Promise(async (resolve, reject) => {
        try {
            // Find and delete the project
            const result = await Project.destroy({
                where: { id: id }
            });

            if (result === 0) {
                throw new Error("Project not found");
            }
            
            resolve();
        } catch (err) {
            console.error("Error in deleteProject:", err);
            reject(err.message || "Unable to delete project");
        }
    });
}

// Export functions
module.exports = {
    initialize,
    getAllProjects,
    getProjectById,
    getProjectsBySector,
    getAllSectors,
    addProject,
    editProject,
    deleteProject,
    Project,
    Sector
};