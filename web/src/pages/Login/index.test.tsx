import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/utils/test-utils';
import Login from './index';

// Mock the auth service
vi.mock('@/services/authService', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
  },
}));

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form by default', () => {
    render(<Login />);
    expect(screen.getByText(/login.title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('switches to register mode', async () => {
    const user = userEvent.setup();
    render(<Login />);

    const switchBtn = screen.getByRole('button', { name: /register/i });
    await user.click(switchBtn);

    expect(screen.getByText(/registerTitle/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup();
    render(<Login />);

    const submitBtn = screen.getByRole('button', { name: /submit|login/i });
    await user.click(submitBtn);

    // Semi UI Form validation should show errors
    await waitFor(() => {
      expect(screen.getByText(/emailRequired|required/i)).toBeInTheDocument();
    });
  });

  it('calls login service and stores token on success', async () => {
    const user = userEvent.setup();
    const mockLogin = vi.fn().mockResolvedValue({
      token: 'test-token',
      user: { id: '1', email: 'test@example.com' },
    });

    vi.mocked(await import('@/services/authService')).authService.login = mockLogin;

    render(<Login />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /submit|login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('calls register service in register mode', async () => {
    const user = userEvent.setup();
    const mockRegister = vi.fn().mockResolvedValue({ id: '1', email: 'test@example.com' });

    vi.mocked(await import('@/services/authService')).authService.register = mockRegister;

    render(<Login />);

    // Switch to register mode
    const switchBtn = screen.getByRole('button', { name: /register/i });
    await user.click(switchBtn);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'password123', 'Test User');
    });
  });
});
