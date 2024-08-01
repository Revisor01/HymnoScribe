// dragAndDrop.js

import { updateLiedblatt, addToSelected } from './liedblattManagement.js';
import { saveSessionToLocalStorage } from './sessionManagement.js';
import { alleObjekte } from './script.js';

export function initializeDragAndDrop(alleObjekte) {
    const poolItems = document.getElementById('pool-items');
    const selectedItems = document.getElementById('selected-items');
    
    poolItems.addEventListener('dragstart', handleDragStart);
    
    selectedItems.addEventListener('dragover', handleDragOver);
    selectedItems.addEventListener('drop', handleDrop);
}

export function handleDragStart(e) {
    if (e.target.classList.contains('item')) {
        e.dataTransfer.setData('text/plain', e.target.textContent);
        e.dataTransfer.effectAllowed = 'copy';
    } else if (e.target.closest('.selected-item')) {
        const selectedItem = e.target.closest('.selected-item');
        e.dataTransfer.setData('text/plain', selectedItem.dataset.id);
        selectedItem.classList.add('dragging');
    }
}

export function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const afterElement = getDragAfterElement(e.currentTarget, e.clientY);
    const draggable = document.querySelector('.dragging');
    if (draggable && afterElement) {
        e.currentTarget.insertBefore(draggable, afterElement);
    } else if (draggable) {
        e.currentTarget.appendChild(draggable);
    }
}

export function handleDrop(e) {
    e.preventDefault();
    const data = e.dataTransfer.getData('text');
    const draggedElement = document.querySelector('.dragging');
    const selectedItems = document.getElementById('selected-items');
    const dropPosition = getDragAfterElement(selectedItems, e.clientY);
    
    if (draggedElement) {
        // Element wurde innerhalb der Selected-Items verschoben
        draggedElement.classList.remove('dragging');
        if (dropPosition) {
            selectedItems.insertBefore(draggedElement, dropPosition);
        } else {
            selectedItems.appendChild(draggedElement);
        }
    } else {
        // Neues Element aus dem Pool
        const [typ, titel] = data.split(': ');
        const objekt = alleObjekte.find(obj => obj.typ === typ && obj.titel === titel);
        if (objekt) {
            addToSelected(objekt);
            // Das neue Element wird am Ende hinzugefügt, also holen wir es uns
            const newItem = selectedItems.lastElementChild;
            if (dropPosition) {
                selectedItems.insertBefore(newItem, dropPosition);
            }
            // Wenn dropPosition null ist, bleibt das Element am Ende, wo es bereits ist
        }
    }
    
    updateLiedblatt();
    saveSessionToLocalStorage();
}

export function handleMouseDown(e) {
    const item = e.target.closest('.selected-item');
    if (!item) return;
    
    const isEditableArea = e.target.closest('.ql-editor') || 
    e.target.closest('input') || 
    e.target.closest('textarea') ||
    e.target.closest('.editor-container');
    
    if (isEditableArea) {
        item.draggable = false;
    } else {
        item.draggable = true;
    }
}

export function handleDragEnd(e) {
    const item = e.target.closest('.selected-item');
    if (item) {
        item.classList.remove('dragging');
        item.draggable = true;  // Reset draggable state
    }
}

export function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.selected-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}