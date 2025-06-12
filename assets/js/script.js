async function loadHTML(url, elementId, callback) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Failed to load ${url}: ${response.statusText}`);
            const placeholder = document.getElementById(elementId);
            if(placeholder) placeholder.innerHTML = `<p class="text-danger text-center">Error: Could not load content for this section.</p>`;
            return;
        }
        const html = await response.text();
        const placeholder = document.getElementById(elementId);
        if (placeholder) {
            placeholder.innerHTML = html;
            if (callback) {
                callback();
            }
        } else {
            console.error(`Placeholder element with ID '${elementId}' not found.`);
        }
    } catch (error) {
        console.error(`Error loading HTML from ${url}:`, error);
        const placeholder = document.getElementById(elementId);
        if(placeholder) placeholder.innerHTML = `<p class="text-danger text-center">Error: Could not load content: ${error.message}.</p>`;
    }
}

/**
 * Initializes features that depend on the navbar being loaded.
 * This includes the theme toggler and active link highlighting.
 */
function initializeNavbarFeatures() {
    // --- Theme Toggler ---
    const themeToggler = document.getElementById('theme-toggler');
    const htmlElement = document.documentElement;

    if (themeToggler && htmlElement) {
        const themeIcon = themeToggler.querySelector('i');
        if (!themeIcon) {
            console.error("Theme icon not found within the theme toggler.");
            // Fallback or error display can be added here
        }

        const setTheme = (theme) => {
            htmlElement.setAttribute('data-bs-theme', theme);
            if (themeIcon) {
                if (theme === 'dark') {
                    themeIcon.classList.remove('bi-braces');
                    themeIcon.classList.add('bi-braces-asterisk');
                } else {
                    themeIcon.classList.remove('bi-braces-asterisk');
                    themeIcon.classList.add('bi-braces');
                }
            }
            localStorage.setItem('theme', theme);
        };

        themeToggler.addEventListener('click', () => {
            const currentTheme = htmlElement.getAttribute('data-bs-theme') || 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });

        const savedTheme = localStorage.getItem('theme');
        const initialHtmlTheme = htmlElement.getAttribute('data-bs-theme') || 'light';
        setTheme(savedTheme || initialHtmlTheme); // Apply saved theme or initial HTML theme

    } else {
        if (!themeToggler) console.warn("Theme toggler button (id: theme-toggler) not found.");
        if (!htmlElement) console.warn("HTML element not found for theme toggler.");
    }

    // --- Active Nav Link ---
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link'); // Query within the loaded navbar
    if (navLinks.length > 0) {
        const currentPageFileName = window.location.pathname.split("/").pop();
        // Normalize for root path or index.html to both match 'index.html' href
        const currentNormalizedPage = (currentPageFileName === '' || currentPageFileName === 'index.html') ? 'index.html' : currentPageFileName;

        navLinks.forEach(link => {
            const linkHref = link.getAttribute('href');
            if (linkHref === currentNormalizedPage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    } else {
        // This might happen briefly before navbar is fully processed or if selector is wrong
        // console.warn("No navigation links found for active link highlighting. This might be a timing issue or an error.");
    }
}

/**
 * Draws a randomly generated fractal tree on a canvas element with a growth animation.
 * The tree's appearance is influenced by the current color scheme (light/dark).
 */
function drawFractalTreeOnAboutPage() {
    const canvas = document.getElementById('fractal-tree-canvas');
    if (!canvas) {
        return;
    }
    const ctx = canvas.getContext('2d');
    const pixelRatio = window.devicePixelRatio || 1; // Get device pixel ratio for high-DPI displays
    let resizeDebounceFrameId; 
    let growthAnimationFrameId; 

    const animationDuration = 1; // 1. Even faster generation (1 second)
    const maxTreeDepth = 10;      // Higher resolution tree (increased depth)

    let treeParams = {}; 
    let startTime;
    let isTreeGenerated = false; // Flag to check if tree structure is ready

    function setCanvasDimensions() {
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;
        
        // Set the actual canvas size in memory (scaled by pixel ratio for crisp rendering)
        canvas.width = displayWidth * pixelRatio;
        canvas.height = displayHeight * pixelRatio;
        
        // Scale the canvas back down using CSS to the display size
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        
        // Scale the drawing context so everything draws at the higher resolution
        ctx.scale(pixelRatio, pixelRatio);
    }

    // Helper function to get solid tree color based on theme
    function getTreeColor() {
        const currentTheme = document.documentElement.getAttribute('data-bs-theme') || 'light';
        return currentTheme === 'dark' ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'; // 2. Solid white for dark theme, solid black for light theme
    }

    function drawTreeRecursive(startX, startY, len, angle, branchWidth, treeColor, currentDepth, maxDepthForThisFrame) {
        if (currentDepth >= maxDepthForThisFrame || len < 0.3 || currentDepth >= maxTreeDepth) { 
            return;
        }

        ctx.beginPath();
        ctx.save();

        ctx.strokeStyle = treeColor; // 2. Single solid color
        ctx.lineWidth = branchWidth;
        ctx.translate(startX, startY);
        ctx.rotate(angle * Math.PI / 180);
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -len);
        ctx.stroke();

        const numBranches = treeParams.branchingFactor[currentDepth];
        const angleOffsetBase = treeParams.angleOffsets[currentDepth];
        const lengthMultiplier = treeParams.lengthMultipliers[currentDepth];
        const currentDepthBranchDetails = treeParams.branchDetails[currentDepth];

        for (let i = 0; i < numBranches; i++) {
            let newAngle = angle;
            const branchDetail = currentDepthBranchDetails[i];
            newAngle += branchDetail.angleAdjustment;
            drawTreeRecursive(0, -len, len * lengthMultiplier, newAngle, Math.max(0.2, branchWidth * 0.75), treeColor, currentDepth + 1, maxDepthForThisFrame);
        }
        ctx.restore();
    }

    // New function to draw the tree statically
    function redrawFullStaticTree() {
        if (!isTreeGenerated || !treeParams.startX) return; 

        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); // Use display dimensions for clearing
        drawTreeRecursive(
            treeParams.startX,
            treeParams.startY,
            treeParams.initialLength,
            treeParams.initialAngle,
            treeParams.initialBranchWidth,
            treeParams.treeColor, // Use stored tree color
            0, 
            maxTreeDepth // Draw all levels
        );
    }

    function animateGrowth(timestamp) {
        if (!startTime) {
            startTime = timestamp;
        }
        const elapsedTime = timestamp - startTime;
        const progress = Math.min(elapsedTime / animationDuration, 1);
        const currentMaxDepthForThisFrame = Math.ceil(progress * maxTreeDepth); // Uses new maxTreeDepth

        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); // Use display dimensions for clearing

        drawTreeRecursive(
            treeParams.startX,
            treeParams.startY,
            treeParams.initialLength,
            treeParams.initialAngle,
            treeParams.initialBranchWidth,
            treeParams.treeColor, // Use stored tree color
            0, 
            currentMaxDepthForThisFrame
        );

        if (progress < 1) {
            growthAnimationFrameId = requestAnimationFrame(animateGrowth);
        }
    }

    function generateRandomTree() {
        if (growthAnimationFrameId) {
            cancelAnimationFrame(growthAnimationFrameId);
        }
        startTime = null;
        isTreeGenerated = false; 

        setCanvasDimensions(); // Set high-resolution canvas dimensions

        // Use display dimensions for calculations, not canvas dimensions
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;

        const startX = displayWidth * 0.05; 
        const startY = displayHeight;       
        const initialAngle = -10;           

        // 3. Bigger Tree (length and width)
        const initialLength = Math.min(displayHeight * 0.22, displayWidth * 0.18) + Math.random() * 50;
        const initialBranchWidth = Math.max(2.5, Math.min(displayWidth * 0.008, 12)) + Math.random() * 4;

        treeParams = {
            startX, startY, initialLength, initialAngle, initialBranchWidth, 
            treeColor: getTreeColor(), // Store single tree color based on current theme
            branchingFactor: [],
            angleOffsets: [],
            lengthMultipliers: [],
            branchDetails: [] 
        };

        for (let d = 0; d < maxTreeDepth; d++) { // Uses new maxTreeDepth
            const numBranchesAtThisDepth = Math.random() < 0.4 ? 2 : 3; 
            treeParams.branchingFactor.push(numBranchesAtThisDepth);
            treeParams.angleOffsets.push(15 + Math.random() * 20); 
            // 3. Bigger Tree (branch length relative to parent)
            treeParams.lengthMultipliers.push(0.73 + Math.random() * 0.1); 

            const depthBranchDetails = [];
            let angleBias = (d / maxTreeDepth) * 15; 
            for (let b = 0; b < numBranchesAtThisDepth; b++) {
                let angleAdjustment;
                if (numBranchesAtThisDepth === 2) {
                    angleAdjustment = (b === 0 ? -1 : 1) * treeParams.angleOffsets[d] * (0.6 + Math.random() * 0.4);
                    if (b === 0) angleAdjustment += angleBias * 0.5; 
                    if (b === 1) angleAdjustment += angleBias;       
                } else { 
                    if (b === 0) { 
                        angleAdjustment = -treeParams.angleOffsets[d] * (0.7 + Math.random() * 0.3) + angleBias * 0.5;
                    } else if (b === 1) { 
                        angleAdjustment = (Math.random() - 0.5) * 10 + angleBias * 0.8; 
                    } else { 
                        angleAdjustment = treeParams.angleOffsets[d] * (0.7 + Math.random() * 0.3) + angleBias;
                    }
                }
                depthBranchDetails.push({ angleAdjustment });
            }
            treeParams.branchDetails.push(depthBranchDetails);
        }
        isTreeGenerated = true; 
        growthAnimationFrameId = requestAnimationFrame(animateGrowth);
    }

    // Initial draw
    generateRandomTree();

    // Handle window resize
    window.addEventListener('resize', () => {
        // 4. Do not recalculate the tree structure when the screen size adjusts
        if (growthAnimationFrameId) { 
            cancelAnimationFrame(growthAnimationFrameId);
            growthAnimationFrameId = null; 
        }
        if (resizeDebounceFrameId) { 
            cancelAnimationFrame(resizeDebounceFrameId);
        }

        resizeDebounceFrameId = requestAnimationFrame(() => {
            setCanvasDimensions(); // Update canvas dimensions with high resolution
            redrawFullStaticTree(); // Redraw the existing tree structure statically
        });
    });

    // Redraw on theme change - this should only recolor, not regenerate
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-bs-theme') {
                if (!isTreeGenerated) break; // Don't recolor if tree isn't generated yet
                
                if (growthAnimationFrameId) cancelAnimationFrame(growthAnimationFrameId);
                if (resizeDebounceFrameId) cancelAnimationFrame(resizeDebounceFrameId); 
                
                // 4. Only recolor the tree, don't regenerate structure
                treeParams.treeColor = getTreeColor(); // Update color based on new theme
                redrawFullStaticTree(); // Redraw with new color
                break;
            }
        }
    });
    observer.observe(document.documentElement, { attributes: true });

    const themeToggler = document.getElementById('themeToggler');
    if (themeToggler) {
        themeToggler.addEventListener('click', () => {
            // The MutationObserver handles theme changes
        });
    }
}


document.addEventListener('DOMContentLoaded', () => {
    // Paths are relative to the HTML file (e.g., index.html at root)
    loadHTML('_navbar.html', 'navbar-placeholder', () => {
        initializeNavbarFeatures();
        // Bootstrap's data-api should handle re-initialization of components like collapse.
        // If navbar toggler (hamburger menu) doesn't work, manual re-initialization might be needed here.
        // Example:
        // const navbarToggler = document.querySelector('.navbar-toggler');
        // const navbarCollapseElement = document.getElementById('navbarNav');
        // if (navbarToggler && navbarCollapseElement && !bootstrap.Collapse.getInstance(navbarCollapseElement)) {
        //    new bootstrap.Collapse(navbarCollapseElement, { toggle: false });
        // }
    });

    loadHTML('_footer.html', 'footer-placeholder', null);

    // Draw fractal tree if on the About Me page
    if (document.getElementById('fractal-tree-canvas')) {
        drawFractalTreeOnAboutPage();
    }
});

document.addEventListener('DOMContentLoaded', function () {
    // ... any existing DOMContentLoaded listeners like navbar/footer loading ...

    const projectCarouselElement = document.getElementById('projectCarousel');

    if (projectCarouselElement) {
        const carouselItems = projectCarouselElement.querySelectorAll('.carousel-item');
        const totalItems = carouselItems.length;
        let bootstrapCarouselInstance;

        // Try to get or create the Bootstrap Carousel instance
        try {
            bootstrapCarouselInstance = bootstrap.Carousel.getOrCreateInstance(projectCarouselElement, {
                interval: false, // Disable auto-sliding for this effect
                wrap: true       // Enable wrapping
            });
        } catch (e) {
            console.error("Failed to initialize Bootstrap Carousel:", e);
            return; // Stop if Bootstrap Carousel can't be initialized
        }

        function updateCarouselItemClasses() {
            if (totalItems === 0) {
                console.warn("Project Carousel: No items found.");
                return;
            }

            const activeItemElement = projectCarouselElement.querySelector('.carousel-item.active');

            if (!activeItemElement) {
                console.warn("Project Carousel: No '.carousel-item.active' found. Cannot apply custom styling. Items may remain hidden.");
                carouselItems.forEach(item => {
                    item.className = item.className.replace(/\s*c-item-\S+/g, '').trim();
                });
                return;
            }
            
            const activeIndex = Array.from(carouselItems).indexOf(activeItemElement);

            carouselItems.forEach((item, i) => {
                item.className = item.className.replace(/\s*c-item-\S+/g, '').trim();
                // Ensure 'carousel-item' and 'active' (if applicable) are preserved or re-added if necessary.
                // Bootstrap should manage its own 'active' class, so we focus on 'c-item-*'.
                // A simple way to ensure base classes are there:
                let baseClasses = ['carousel-item'];
                if (item === activeItemElement) baseClasses.push('active');
                // item.className = baseClasses.join(' '); // This would strip other classes, be careful.
                // The regex replace should be fine if it only targets c-item-*

                let diff = i - activeIndex;

                if (totalItems > 1) { 
                    if (Math.abs(diff) > totalItems / 2) {
                        if (diff > 0) {
                            diff -= totalItems;
                        } else {
                            diff += totalItems;
                        }
                    }
                }
                
                if (diff === 0) {
                    item.classList.add('c-item-active');
                } else if (diff === 1) {
                    item.classList.add('c-item-next-1');
                } else if (diff === -1) {
                    item.classList.add('c-item-prev-1');
                } else if (diff === 2) {
                    item.classList.add('c-item-next-2');
                } else if (diff === -2) {
                    item.classList.add('c-item-prev-2');
                } else {
                    item.classList.add('c-item-far');
                }
            });
        }

        projectCarouselElement.addEventListener('slid.bs.carousel', function () {
            requestAnimationFrame(updateCarouselItemClasses);
        });
        
        setTimeout(() => {
            console.log("Project Carousel: Attempting initial class update.");
            if (projectCarouselElement.querySelector('.carousel-item.active')) {
                 updateCarouselItemClasses();
            } else {
                console.warn("Project Carousel: Initial check failed to find '.carousel-item.active'. Items might be hidden.");
                // If no item is active, and there are items, make the first one active as a fallback.
                if(carouselItems.length > 0 && !projectCarouselElement.querySelector('.carousel-item.active')){
                    console.log("Project Carousel: Forcing first item to active and re-running update.");
                    carouselItems[0].classList.add('active');
                    // Re-initialize or update the carousel instance if needed after manually changing active state
                    if(bootstrapCarouselInstance && typeof bootstrapCarouselInstance.to === 'function') {
                        // bootstrapCarouselInstance.to(0); // This might trigger another slide event, be careful
                    }
                    updateCarouselItemClasses(); 
                }
            }
        }, 250); // Increased timeout slightly more for safety, especially with other deferred scripts.

    } else {
        console.warn("Project Carousel: Element with ID 'projectCarousel' not found.");
    };
});

document.addEventListener('DOMContentLoaded', function() {
    // Assuming your form has an ID, for example, 'contactForm'
    const contactForm = document.getElementById('contactForm'); // Make sure your form has this ID or use a different selector
    const errorMessage = document.getElementById('form-error-message');

    if (contactForm && errorMessage) {
        contactForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Prevent the default form submission

            errorMessage.classList.remove('d-none');

        });
    }
});