#!/usr/bin/env node

/**
 * Graceful Server Shutdown Script
 * 
 * This script checks for any process running on the specified port
 * and attempts to gracefully terminate it before starting a new server.
 */

const { execSync, spawn } = require('child_process');
const os = require('os');
const readline = require('readline');

// Default port for the server
const DEFAULT_PORT = 3002;

// Get port from command line arguments or use default
const port = process.argv[2] || DEFAULT_PORT;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Log a message with color
 * @param {string} message - The message to log
 * @param {string} color - The color to use
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Find the process ID using the specified port
 * @param {number} port - The port to check
 * @returns {string|null} - The PID of the process using the port, or null if none found
 */
function findProcessByPort(port) {
  try {
    let command;
    let processInfo = null;
    
    // Different commands based on operating system
    if (process.platform === 'win32') {
      // Windows
      command = `netstat -ano | findstr :${port}`;
      const output = execSync(command, { encoding: 'utf8' });
      
      if (output) {
        const lines = output.split('\n');
        for (const line of lines) {
          if (line.includes(`LISTENING`)) {
            const parts = line.trim().split(/\s+/);
            if (parts.length > 4) {
              processInfo = {
                pid: parts[4],
                command: 'Unknown (Windows does not provide command info via netstat)'
              };
              break;
            }
          }
        }
      }
    } else {
      // macOS and Linux
      try {
        // Try lsof first (available on macOS and many Linux distros)
        command = `lsof -i :${port} -t`;
        const pid = execSync(command, { encoding: 'utf8' }).trim();
        
        if (pid) {
          // Get process command
          const psCommand = process.platform === 'darwin' 
            ? `ps -p ${pid} -o command=` // macOS
            : `ps -p ${pid} -o cmd=`;    // Linux
            
          const cmd = execSync(psCommand, { encoding: 'utf8' }).trim();
          processInfo = { pid, command: cmd };
        }
      } catch (e) {
        // If lsof fails, try netstat (more widely available)
        try {
          command = `netstat -nlp 2>/dev/null | grep :${port}`;
          const output = execSync(command, { encoding: 'utf8' });
          
          if (output) {
            const match = output.match(/LISTEN\s+(\d+)/);
            if (match && match[1]) {
              const pid = match[1];
              const cmd = execSync(`ps -p ${pid} -o cmd=`, { encoding: 'utf8' }).trim();
              processInfo = { pid, command: cmd };
            }
          }
        } catch (netstatErr) {
          // Both methods failed
          log(`Could not determine process using port ${port}. You may need to check manually.`, colors.yellow);
        }
      }
    }
    
    return processInfo;
  } catch (error) {
    log(`Error finding process: ${error.message}`, colors.red);
    return null;
  }
}

/**
 * Kill a process gracefully
 * @param {string} pid - The process ID to kill
 * @param {boolean} force - Whether to force kill the process
 * @returns {boolean} - Whether the process was successfully killed
 */
function killProcess(pid, force = false) {
  try {
    if (process.platform === 'win32') {
      // Windows
      execSync(`taskkill ${force ? '/F' : ''} /PID ${pid}`);
    } else {
      // macOS and Linux
      execSync(`kill ${force ? '-9' : '-15'} ${pid}`);
    }
    return true;
  } catch (error) {
    log(`Error killing process: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Main function to stop the server
 */
function stopServer() {
  log(`Checking for processes using port ${port}...`, colors.cyan);
  
  const processInfo = findProcessByPort(port);
  
  if (!processInfo) {
    log(`No process found using port ${port}. The port is free.`, colors.green);
    return;
  }
  
  log(`Found process using port ${port}:`, colors.yellow);
  log(`  PID: ${processInfo.pid}`, colors.yellow);
  log(`  Command: ${processInfo.command}`, colors.yellow);
  
  // Ask for confirmation before killing
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question(`Do you want to terminate this process? (y/N) `, (answer) => {
    if (answer.toLowerCase() === 'y') {
      log(`Attempting to gracefully terminate process ${processInfo.pid}...`, colors.cyan);
      
      if (killProcess(processInfo.pid)) {
        log(`Process ${processInfo.pid} terminated gracefully.`, colors.green);
        
        // Check if the process is still running after a short delay
        setTimeout(() => {
          const stillRunning = findProcessByPort(port);
          if (stillRunning) {
            log(`Process is still running. Attempting to force kill...`, colors.yellow);
            if (killProcess(processInfo.pid, true)) {
              log(`Process ${processInfo.pid} force killed.`, colors.green);
            } else {
              log(`Failed to force kill process ${processInfo.pid}. You may need to terminate it manually.`, colors.red);
            }
          }
          rl.close();
        }, 1000);
      } else {
        log(`Failed to terminate process ${processInfo.pid} gracefully. Attempting to force kill...`, colors.yellow);
        if (killProcess(processInfo.pid, true)) {
          log(`Process ${processInfo.pid} force killed.`, colors.green);
        } else {
          log(`Failed to force kill process ${processInfo.pid}. You may need to terminate it manually.`, colors.red);
        }
        rl.close();
      }
    } else {
      log(`Process termination cancelled.`, colors.yellow);
      rl.close();
    }
  });
}

// Run the main function
stopServer();
