/**
 * @typedef {Object} GeoLocation
 * @property {number} lat
 * @property {number} lng
 * @property {string} [address]
 * @property {string} [ward]
 * @property {string} [landmark]
 */

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} displayName
 * @property {string} [photoURL]
 * @property {string} role
 * @property {number} points
 * @property {string[]} badges
 * @property {GeoLocation} [location]
 * @property {import('firebase-admin/firestore').Timestamp} createdAt
 * @property {import('firebase-admin/firestore').Timestamp} updatedAt
 */

/**
 * @typedef {Object} Issue
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} category
 * @property {string} severity
 * @property {string} priority
 * @property {string} status
 * @property {string} reporterId
 * @property {string} reporterName
 * @property {string[]} mediaUrls
 * @property {GeoLocation} location
 * @property {string} [department]
 * @property {string[]} [hazards]
 * @property {number} aiConfidence
 * @property {number} supportCount
 * @property {number} verificationScore
 * @property {string} [assignedTo]
 * @property {string} [assignedWorkerName]
 * @property {string[]} [beforeImages]
 * @property {string[]} [afterImages]
 * @property {string} [resolutionStatus]
 * @property {string} [aiSummary]
 * @property {boolean} [isDuplicate]
 * @property {string} [duplicateOf]
 * @property {import('firebase-admin/firestore').Timestamp} createdAt
 * @property {import('firebase-admin/firestore').Timestamp} updatedAt
 */

/**
 * @typedef {Object} Comment
 * @property {string} id
 * @property {string} issueId
 * @property {string} userId
 * @property {string} userName
 * @property {string} content
 * @property {boolean} isHelpful
 * @property {import('firebase-admin/firestore').Timestamp} createdAt
 */

/**
 * @typedef {Object} Verification
 * @property {string} id
 * @property {string} issueId
 * @property {string} userId
 * @property {string} status
 * @property {string} [comment]
 * @property {string[]} [evidenceUrls]
 * @property {import('firebase-admin/firestore').Timestamp} createdAt
 */

/**
 * @typedef {Object} Notification
 * @property {string} id
 * @property {string} userId
 * @property {string} type
 * @property {string} title
 * @property {string} message
 * @property {string} [issueId]
 * @property {boolean} read
 * @property {import('firebase-admin/firestore').Timestamp} createdAt
 */

/**
 * @typedef {Object} TimelineEvent
 * @property {string} status
 * @property {string} label
 * @property {string} [description]
 * @property {string} [actor]
 * @property {import('firebase-admin/firestore').Timestamp} timestamp
 */

/**
 * @typedef {Object} VisionAnalysis
 * @property {string} category
 * @property {string} title
 * @property {string} description
 * @property {string} severity
 * @property {string} department
 * @property {string[]} hazards
 * @property {number} confidence
 */

/**
 * @typedef {Object} DuplicateMatch
 * @property {string} issueId
 * @property {string} title
 * @property {number} similarity
 * @property {number} distance
 */

/**
 * @typedef {Object} PriorityResult
 * @property {string} priority
 * @property {number} score
 * @property {string} reasoning
 */

/**
 * @typedef {Object} ResolutionVerification
 * @property {string} status
 * @property {number} confidence
 * @property {string} analysis
 */

export {};
