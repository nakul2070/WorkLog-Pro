-- ============================================
-- 14. PROJECT ACCESS REQUESTS TABLE
-- ============================================
-- This table stores project access requests submitted by employees and project managers
CREATE TABLE project_access_requests (
  id VARCHAR(36) PRIMARY KEY,
  
  user_id VARCHAR(36) NOT NULL,
  request_message TEXT NOT NULL,
  
  status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
  
  admin_response TEXT,
  responded_by VARCHAR(36),
  responded_at TIMESTAMP NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (responded_by) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

