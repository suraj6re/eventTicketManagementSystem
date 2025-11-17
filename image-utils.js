// Image loading utility functions
const ImageUtils = {
    // Load an image with proper error handling and placeholder fallback
    loadImage: function(imgElement, src, placeholderSrc = '/static/images/placeholder.svg') {
        imgElement.classList.add('loading');
        
        // Pre-load the image
        const tempImg = new Image();
        
        tempImg.onload = function() {
            imgElement.src = src;
            imgElement.classList.remove('loading');
            imgElement.classList.remove('error');
        };
        
        tempImg.onerror = function() {
            console.warn(`Failed to load image: ${src}`);
            imgElement.src = placeholderSrc;
            imgElement.classList.remove('loading');
            imgElement.classList.add('error');
        };
        
        // Start loading
        tempImg.src = src;
    },

    // Update image sources to use static prefix
    getStaticImagePath: function(path) {
        if (!path) return '/static/images/placeholder.svg';
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        if (path.startsWith('/static/')) return path;
        return `/static${path.startsWith('/') ? '' : '/'}${path}`;
    }
};

// Export for use in other files
    // Handle broken images across the site
    handleBrokenImages: function() {
        document.addEventListener('error', function(e) {
            if (e.target.tagName.toLowerCase() === 'img') {
                console.warn(`Image failed to load: ${e.target.src}`);
                if (!e.target.classList.contains('error')) {
                    ImageUtils.loadImage(e.target, e.target.src);
                }
            }
        }, true);
    }
};

// Initialize image error handling
ImageUtils.handleBrokenImages();

    // Handle broken images across the site
    handleBrokenImages() {
        document.addEventListener('error', (e) => {
            if (e.target.tagName.toLowerCase() === 'img') {
                console.warn(`Image failed to load: ${e.target.src}`);
                if (!e.target.classList.contains('error')) {
                    this.loadImage(e.target, e.target.src);
                }
            }
        }, true);
    }
};

// Initialize image error handling
document.addEventListener('DOMContentLoaded', () => {
    ImageUtils.handleBrokenImages();
});

// Export for use in other files
window.ImageUtils = ImageUtils;