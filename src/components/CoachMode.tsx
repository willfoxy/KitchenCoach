/**
 * Coach Mode Component
 * Based on PRD Section 10.2: Coach mode
 */

import React, { useState, useEffect } from 'react';
import { RecipeGraph, Task, Timer, CoachModeState } from '../types/recipe';
import { RecipeScheduler } from '../services/scheduler';
import './CoachMode.css';

interface CoachModeProps {
  graph: RecipeGraph;
}

export const CoachMode: React.FC<CoachModeProps> = ({ graph }) => {
  const [scheduler] = useState(() => new RecipeScheduler(graph));
  const [allTasks] = useState(() => scheduler.createTasks());
  const [coachState, setCoachState] = useState<CoachModeState>(() =>
    scheduler.initializeCoachMode()
  );
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second for timer display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Check for completed timers
  useEffect(() => {
    const completedTimers = coachState.activeTimers.filter(
      timer => timer.endsAt <= currentTime
    );

    if (completedTimers.length > 0) {
      // Remove completed timers and show notification
      const remainingTimers = coachState.activeTimers.filter(
        timer => timer.endsAt > currentTime
      );

      setCoachState(prev => ({
        ...prev,
        activeTimers: remainingTimers
      }));

      // Show notification for each completed timer
      completedTimers.forEach(timer => {
        if (timer.notification && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification('Timer Complete!', {
              body: `${timer.name} is ready`,
              icon: '/timer-icon.png'
            });
          }
        }
      });
    }
  }, [currentTime, coachState.activeTimers]);

  const handleCompleteTask = (taskId: string) => {
    const updatedState = scheduler.updateCoachMode(coachState, taskId, allTasks);
    setCoachState(updatedState);
  };

  const handleStartTask = (taskId: string) => {
    // Mark task as in_progress
    setCoachState(prev => ({
      ...prev,
      now: prev.now.map(task =>
        task.id === taskId ? { ...task, status: 'in_progress' as const } : task
      )
    }));
  };

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return (
    <div className="coach-mode">
      <div className="coach-header">
        <h2>🧑‍🍳 Coach Mode</h2>
        <p className="coach-subtitle">Follow along step by step</p>
      </div>

      {/* Active Timers */}
      {coachState.activeTimers.length > 0 && (
        <div className="timers-section">
          <h3>⏱️ Active Timers</h3>
          <div className="timers-list">
            {coachState.activeTimers.map(timer => (
              <TimerCard key={timer.id} timer={timer} currentTime={currentTime} />
            ))}
          </div>
        </div>
      )}

      {/* Now Tasks */}
      <div className="tasks-section now-section">
        <h3>🔥 Do This Now</h3>
        {coachState.now.length > 0 ? (
          <div className="tasks-list">
            {coachState.now.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={handleCompleteTask}
                onStart={handleStartTask}
                variant="now"
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            {coachState.activeTimers.length > 0 ? (
              <p>⏳ Wait for timers to complete...</p>
            ) : (
              <p>🎉 All tasks complete! Enjoy your meal!</p>
            )}
          </div>
        )}
      </div>

      {/* Next Task */}
      {coachState.next && (
        <div className="tasks-section next-section">
          <h3>👀 Coming Up Next</h3>
          <div className="tasks-list">
            <TaskCard task={coachState.next} variant="next" />
          </div>
        </div>
      )}

      {/* Later Tasks */}
      {coachState.later.length > 0 && (
        <div className="tasks-section later-section">
          <h3>📋 Optional Prep (if you want to get ahead)</h3>
          <div className="tasks-list">
            {coachState.later.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={handleCompleteTask}
                onStart={handleStartTask}
                variant="later"
              />
            ))}
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="progress-section">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${(coachState.completedTasks.length / allTasks.length) * 100}%`
            }}
          />
        </div>
        <p className="progress-text">
          {coachState.completedTasks.length} of {allTasks.length} tasks completed
        </p>
      </div>
    </div>
  );
};

interface TimerCardProps {
  timer: Timer;
  currentTime: number;
}

const TimerCard: React.FC<TimerCardProps> = ({ timer, currentTime }) => {
  const remainingSec = Math.max(0, Math.floor((timer.endsAt - currentTime) / 1000));
  const totalSec = timer.durationSec;
  const progress = ((totalSec - remainingSec) / totalSec) * 100;

  return (
    <div className="timer-card">
      <div className="timer-header">
        <span className="timer-name">{timer.name}</span>
        <span className="timer-remaining">{formatTime(remainingSec)}</span>
      </div>
      <div className="timer-progress">
        <div className="timer-progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

interface TaskCardProps {
  task: Task;
  onComplete?: (taskId: string) => void;
  onStart?: (taskId: string) => void;
  variant: 'now' | 'next' | 'later';
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onComplete, onStart, variant }) => {
  return (
    <div className={`task-card task-${variant} task-${task.status}`}>
      <div className="task-header">
        <h4 className="task-name">{task.name}</h4>
        {task.status === 'in_progress' && <span className="status-badge">In Progress</span>}
      </div>

      {task.description && <p className="task-description">{task.description}</p>}

      {task.timing && (
        <div className="task-timing">
          {task.timing.active_sec > 0 && (
            <span className="timing-badge active">
              ⏱️ {formatTime(task.timing.active_sec)}
            </span>
          )}
          {task.timing.passive_sec > 0 && (
            <span className="timing-badge passive">
              ⏳ {formatTime(task.timing.passive_sec)} wait
            </span>
          )}
        </div>
      )}

      {task.equipment && task.equipment.length > 0 && (
        <div className="task-equipment">
          <span className="equipment-label">🔧</span>
          {task.equipment.join(', ')}
        </div>
      )}

      {variant === 'now' && task.status === 'pending' && onStart && (
        <button className="task-button start-button" onClick={() => onStart(task.id)}>
          Start Task
        </button>
      )}

      {variant === 'now' && task.status === 'in_progress' && onComplete && (
        <button className="task-button complete-button" onClick={() => onComplete(task.id)}>
          ✓ Mark Complete
        </button>
      )}
    </div>
  );
};

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
}
