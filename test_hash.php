<?php
$password = 'password123';
$hash2y = password_hash($password, PASSWORD_BCRYPT);
$hash2b = str_replace('$2y$', '$2b$', $hash2y);

echo "Hash 2y: $hash2y\n";
echo "Hash 2b: $hash2b\n";

echo "Verify 2y with 2y: " . (password_verify($password, $hash2y) ? 'OK' : 'FAIL') . "\n";
echo "Verify 2y with 2b: " . (password_verify($password, $hash2b) ? 'OK' : 'FAIL') . "\n";

// Reverse test: if we have a 2b hash, can we verify it?
$supaHash = '$2b$10$O9l.u.XqZ1m4Y.X5m4Y.XuXqZ1m4Y.X5m4Y.XuXqZ1m4Y.X5m4Y.X'; // Mock hash
echo "Verify supaHash (2b): " . (password_verify('anything', $supaHash) ? 'OK' : 'FAIL') . " (expected FAIL but should not error)\n";
