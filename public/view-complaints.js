const API_URL = '/api/complaints';
let currentComplaintId = null;

// Load all complaints on page load
async function loadComplaintsForView() {
  try {
    const response = await fetch(API_URL);
    const complaints = await response.json();
    const listPanel = document.getElementById('complaintListPanel');

    if (complaints.length === 0) {
      listPanel.innerHTML = '<p class="text-muted">No complaints found</p>';
      return;
    }

    listPanel.innerHTML = complaints.map(complaint => `
      <div class="card mb-2 cursor-pointer complaint-card" onclick="selectComplaint(${complaint.id})" style="cursor: pointer;">
        <div class="card-body p-2">
          <h6 class="card-title mb-1">${complaint.title}</h6>
          <small class="text-muted">ID: #${complaint.id}</small><br>
          <small>
            <span class="badge ${getStatusBadgeClass(complaint.status)}">${complaint.status}</span>
            <span class="badge ${getPriorityBadgeClass(complaint.priority)}">${complaint.priority}</span>
          </small>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading complaints:', error);
  }
}

// Select a complaint to view details
async function selectComplaint(complaintId) {
  currentComplaintId = complaintId;

  try {
    const response = await fetch(`${API_URL}/${complaintId}/details`);
    const data = await response.json();

    const complaint = data.complaint;
    const comments = data.comments;

    // Hide "no selection" message and show details
    document.getElementById('noComplaintSelected').style.display = 'none';
    document.getElementById('complaintDetailPanel').style.display = 'block';

    // Update complaint details
    document.getElementById('complaintTitle').textContent = complaint.title;
    document.getElementById('complaintDescription').textContent = complaint.description;
    document.getElementById('complaintStatus').textContent = complaint.status;
    document.getElementById('complaintPriority').textContent = complaint.priority;
    document.getElementById('complaintCategory').textContent = complaint.category;
    document.getElementById('complaintDate').textContent = new Date(complaint.created_at).toLocaleString();
    document.getElementById('statusSelect').value = complaint.status;

    // Update comments
    displayComments(comments);

    // Highlight selected complaint
    document.querySelectorAll('.complaint-card').forEach(card => {
      card.classList.remove('border-primary', 'border-3');
    });
    event.currentTarget.classList.add('border-primary', 'border-3');
  } catch (error) {
    alert('Error loading complaint details: ' + error.message);
  }
}

// Display comments for the selected complaint
function displayComments(comments) {
  const commentsList = document.getElementById('commentsList');

  if (comments.length === 0) {
    commentsList.innerHTML = '<p class="text-muted">No comments yet...</p>';
    return;
  }

  commentsList.innerHTML = comments.map(comment => `
    <div class="card mb-3 ${comment.is_resolution ? 'border-success' : 'border-secondary'}">
      <div class="card-body p-3">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h6 class="card-subtitle mb-1">
              <strong>${comment.author}</strong>
              ${comment.is_resolution ? '<span class="badge bg-success ms-2">Solution</span>' : ''}
            </h6>
            <small class="text-muted">${new Date(comment.created_at).toLocaleString()}</small>
          </div>
          <button class="btn btn-sm btn-danger" onclick="deleteComment(${comment.id})">Delete</button>
        </div>
        <p class="card-text mt-2">${comment.comment}</p>
      </div>
    </div>
  `).join('');
}

// Add comment form submission
document.getElementById('addCommentForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!currentComplaintId) {
    alert('Please select a complaint first');
    return;
  }

  const commentData = {
    comment: document.getElementById('commentText').value,
    author: document.getElementById('authorName').value,
    is_resolution: document.getElementById('isResolution').checked
  };

  try {
    const response = await fetch(`${API_URL}/${currentComplaintId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commentData)
    });

    if (response.ok) {
      document.getElementById('addCommentForm').reset();
      // Reload complaint details to show new comment
      selectComplaint(currentComplaintId);
    } else {
      alert('Error adding comment');
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
});

// Update complaint status
async function updateComplaintStatus() {
  if (!currentComplaintId) {
    alert('Please select a complaint first');
    return;
  }

  const status = document.getElementById('statusSelect').value;

  try {
    const response = await fetch(`${API_URL}/${currentComplaintId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    if (response.ok) {
      alert('Status updated successfully');
      selectComplaint(currentComplaintId);
      loadComplaintsForView();
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

// Delete comment
async function deleteComment(commentId) {
  if (!confirm('Delete this comment?')) return;

  try {
    const response = await fetch(`/api/comments/${commentId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      selectComplaint(currentComplaintId);
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

// Helper function for status badge
function getStatusBadgeClass(status) {
  const classes = {
    'Open': 'bg-danger',
    'In Progress': 'bg-warning',
    'Resolved': 'bg-info',
    'Closed': 'bg-success'
  };
  return classes[status] || 'bg-secondary';
}

// Helper function for priority badge
function getPriorityBadgeClass(priority) {
  const classes = {
    'High': 'bg-danger',
    'Medium': 'bg-warning',
    'Low': 'bg-success'
  };
  return classes[priority] || 'bg-secondary';
}

// Load complaints on page load
loadComplaintsForView();
setInterval(loadComplaintsForView, 10000); // Refresh every 10 seconds
