const papeis = document.querySelectorAll('.papel');

window.addEventListener('load', () => {
    initializepapeis();
});

function initializepapeis() {
    window.papelPositions = Array.from(papeis).map((papel, index) => {
        return {
            x: 20 + (index * 80) % (window.innerWidth - 80),
            y: 30 + (index * 60) % (window.innerHeight - 80),
            vx: 0,
            vy: 0,
            dragging: false,
        };
    });

    const papelImages = [
        'images/papelzinho.png',
    ];

    papeis.forEach((papel, index) => {
        papel.style.backgroundImage = `url('${papelImages[index % papelImages.length]}')`;
        papel.style.left = `${window.papelPositions[index].x}px`;
        papel.style.top = `${window.papelPositions[index].y}px`;
    });

    initializeDragEvents();
    initializeShakeBounce();
    requestAnimationFrame(tick);
}


const sensitivity = 0.1;
const bounceThreshold = 5;
const damping = 0.95;

function tick() {
    if (window.papelPositions) {
        papeis.forEach((papel, index) => {
            const pos = window.papelPositions[index];
            if (pos.dragging) return;

            pos.vx *= damping;
            pos.vy *= damping;

            pos.x += pos.vx;
            pos.y += pos.vy;

            const maxX = window.innerWidth - papel.offsetWidth;
            const maxY = window.innerHeight - papel.offsetHeight;

            if (pos.x < 0 || pos.x > maxX) {
                pos.vx *= -1;
                pos.x = Math.max(0, Math.min(maxX, pos.x));
                if (Math.abs(pos.vx) > bounceThreshold) triggerBounce(papel);
            }
            if (pos.y < 0 || pos.y > maxY) {
                pos.vy *= -1;
                pos.y = Math.max(0, Math.min(maxY, pos.y));
                if (Math.abs(pos.vy) > bounceThreshold) triggerBounce(papel);
            }

            papel.style.left = `${pos.x}px`;
            papel.style.top = `${pos.y}px`;
        });

        checkCollisions();
    }

    requestAnimationFrame(tick);
}

function triggerBounce(papel) {
    papel.classList.add('bounce');
    setTimeout(() => papel.classList.remove('bounce'), 300);
}

// Desktop replacement for the old device-tilt/gyroscope input: fast mouse
// (or finger) movement across the page shakes the papers around, same way
// tilting the phone used to.
const shakeRadius = 30;

let lastPointerX = null;
let lastPointerY = null;
let lastPointerTime = null;

function handleShake(clientX, clientY) {
    if (!window.papelPositions) return;
    if (window.papelPositions.some(pos => pos.dragging)) return;

    const now = Date.now();
    if (lastPointerX !== null) {
        const dt = Math.max(now - lastPointerTime, 1);
        const shakeVx = ((clientX - lastPointerX) / dt) * 16;
        const shakeVy = ((clientY - lastPointerY) / dt) * 16;

        papeis.forEach((papel, index) => {
            const pos = window.papelPositions[index];

            const centerX = pos.x + papel.offsetWidth / 2;
            const centerY = pos.y + papel.offsetHeight / 2;
            const distance = Math.hypot(centerX - clientX, centerY - clientY);
            if (distance > shakeRadius) return;

            pos.vx += shakeVx * sensitivity;
            pos.vy += shakeVy * sensitivity;
        });
    }

    lastPointerX = clientX;
    lastPointerY = clientY;
    lastPointerTime = now;
}

function initializeShakeBounce() {
    window.addEventListener('mousemove', (event) => handleShake(event.clientX, event.clientY));
    window.addEventListener('touchmove', (event) => {
        const touch = event.touches[0];
        if (touch) handleShake(touch.clientX, touch.clientY);
    });
}

function checkCollisions() {
    for (let i = 0; i < papeis.length; i++) {
        for (let j = i + 1; j < papeis.length; j++) {
            const papel1 = papeis[i];
            const papel2 = papeis[j];

            const rect1 = papel1.getBoundingClientRect();
            const rect2 = papel2.getBoundingClientRect();

            if (
                rect1.left < rect2.right &&
                rect1.right > rect2.left &&
                rect1.top < rect2.bottom &&
                rect1.bottom > rect2.top
            ) {
                handleCollision(papel1, papel2);
                separatepapeis(papel1, papel2);
            }
        }
    }
}

function handleCollision(papel1, papel2) {
    const index1 = Array.from(papeis).indexOf(papel1);
    const index2 = Array.from(papeis).indexOf(papel2);
    const relativeVelocityX = Math.abs(window.papelPositions[index1].vx - window.papelPositions[index2].vx);
    const relativeVelocityY = Math.abs(window.papelPositions[index1].vy - window.papelPositions[index2].vy);

    if (relativeVelocityX > bounceThreshold || relativeVelocityY > bounceThreshold) {
        const tempVx = window.papelPositions[index1].vx;
        const tempVy = window.papelPositions[index1].vy;

        window.papelPositions[index1].vx = window.papelPositions[index2].vx;
        window.papelPositions[index1].vy = window.papelPositions[index2].vy;

        window.papelPositions[index2].vx = tempVx;
        window.papelPositions[index2].vy = tempVy;

        papel1.classList.add('bounce');
        papel2.classList.add('bounce');
        setTimeout(() => {
            papel1.classList.remove('bounce');
            papel2.classList.remove('bounce');
        }, 300);
    } else {
        window.papelPositions[index1].vx *= 0.5;
        window.papelPositions[index1].vy *= 0.5;
        window.papelPositions[index2].vx *= 0.5;
        window.papelPositions[index2].vy *= 0.5;
    }
}

function separatepapeis(papel1, papel2) {
    const index1 = Array.from(papeis).indexOf(papel1);
    const index2 = Array.from(papeis).indexOf(papel2);

    const center1 = {
        x: window.papelPositions[index1].x + papel1.offsetWidth / 2,
        y: window.papelPositions[index1].y + papel1.offsetHeight / 2,
    };
    const center2 = {
        x: window.papelPositions[index2].x + papel2.offsetWidth / 2,
        y: window.papelPositions[index2].y + papel2.offsetHeight / 2,
    };

    const dx = center2.x - center1.x;
    const dy = center2.y - center1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const minDistance = (papel1.offsetWidth + papel2.offsetWidth) / 2;

    if (distance < minDistance) {
        const overlap = minDistance - distance;
        const directionX = dx / distance;
        const directionY = dy / distance;

        window.papelPositions[index1].x -= overlap * directionX / 2;
        window.papelPositions[index1].y -= overlap * directionY / 2;
        window.papelPositions[index2].x += overlap * directionX / 2;
        window.papelPositions[index2].y += overlap * directionY / 2;

        papel1.style.left = `${window.papelPositions[index1].x}px`;
        papel1.style.top = `${window.papelPositions[index1].y}px`;
        papel2.style.left = `${window.papelPositions[index2].x}px`;
        papel2.style.top = `${window.papelPositions[index2].y}px`;
    }
}

function initializeDragEvents() {
    papeis.forEach(papel => {
        const index = Array.from(papeis).indexOf(papel);

        const movePapelTo = (clientX, clientY) => {
            const pos = window.papelPositions[index];

            pos.x = Math.max(0, Math.min(window.innerWidth - papel.offsetWidth, clientX - papel.offsetWidth / 2));
            pos.y = Math.max(0, Math.min(window.innerHeight - papel.offsetHeight, clientY - papel.offsetHeight / 2));

            papel.style.left = `${pos.x}px`;
            papel.style.top = `${pos.y}px`;

            pos.vx = 0;
            pos.vy = 0;
        };

        papel.addEventListener('touchstart', (event) => {
            window.papelPositions[index].dragging = true;
            event.preventDefault();
        });

        papel.addEventListener('touchmove', (event) => {
            if (window.papelPositions[index].dragging) {
                const touch = event.touches[0];
                movePapelTo(touch.clientX, touch.clientY);
            }
        });

        papel.addEventListener('touchend', () => {
            window.papelPositions[index].dragging = false;
        });

        papel.addEventListener('mousedown', (event) => {
            window.papelPositions[index].dragging = true;
            event.preventDefault();
        });

        window.addEventListener('mousemove', (event) => {
            if (window.papelPositions[index].dragging) {
                movePapelTo(event.clientX, event.clientY);
            }
        });

        window.addEventListener('mouseup', () => {
            window.papelPositions[index].dragging = false;
        });
    });
}
