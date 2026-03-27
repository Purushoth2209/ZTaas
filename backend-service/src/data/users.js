export const users = [
  // Admins
  { id: 1,  username: 'alice',    password: 'password123', role: 'admin',   category: 'normal' },
  { id: 2,  username: 'bob',      password: 'password123', role: 'admin',   category: 'normal' },

  // Analysts
  { id: 3,  username: 'carol',    password: 'password123', role: 'analyst', category: 'normal' },
  { id: 4,  username: 'dave',     password: 'password123', role: 'analyst', category: 'normal' },
  { id: 5,  username: 'eve',      password: 'password123', role: 'analyst', category: 'suspect' },

  // Normal users
  { id: 6,  username: 'frank',    password: 'password123', role: 'user',    category: 'normal' },
  { id: 7,  username: 'grace',    password: 'password123', role: 'user',    category: 'normal' },
  { id: 8,  username: 'henry',    password: 'password123', role: 'user',    category: 'normal' },
  { id: 9,  username: 'iris',     password: 'password123', role: 'user',    category: 'normal' },
  { id: 10, username: 'jack',     password: 'password123', role: 'user',    category: 'normal' },
  { id: 11, username: 'karen',    password: 'password123', role: 'user',    category: 'normal' },
  { id: 12, username: 'leo',      password: 'password123', role: 'user',    category: 'normal' },
  { id: 13, username: 'mia',      password: 'password123', role: 'user',    category: 'normal' },

  // Suspects — unusual but not confirmed malicious
  { id: 14, username: 'nathan',   password: 'password123', role: 'user',    category: 'suspect' },
  { id: 15, username: 'olivia',   password: 'password123', role: 'user',    category: 'suspect' },
  { id: 16, username: 'peter',    password: 'password123', role: 'analyst', category: 'suspect' },
  { id: 17, username: 'quinn',    password: 'password123', role: 'user',    category: 'suspect' },

  // Attackers — high volume, high failure, multiple IPs
  { id: 18, username: 'ryan',     password: 'password123', role: 'user',    category: 'attacker' },
  { id: 19, username: 'sara',     password: 'password123', role: 'user',    category: 'attacker' },
  { id: 20, username: 'tom',      password: 'password123', role: 'user',    category: 'attacker' },
  { id: 21, username: 'uma',      password: 'password123', role: 'analyst', category: 'attacker' },
  { id: 22, username: 'victor',   password: 'password123', role: 'user',    category: 'attacker' },
];
