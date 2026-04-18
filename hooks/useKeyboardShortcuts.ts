import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useKeyboardShortcuts = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + K (Search)
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.getElementById('global-search') as HTMLInputElement;
                if (searchInput) {
                    searchInput.focus();
                }
            }

            // Alt + D (Dashboard)
            if (e.altKey && e.key === 'd') {
                e.preventDefault();
                navigate('/');
            }

            // Alt + R (Reports)
            if (e.altKey && e.key === 'r') {
                e.preventDefault();
                navigate('/reports');
            }

            // Alt + I (Inbound)
            if (e.altKey && e.key === 'i') {
                e.preventDefault();
                navigate('/transactions/gate-in');
            }

            // Alt + O (Outbound)
            if (e.altKey && e.key === 'o') {
                e.preventDefault();
                navigate('/transactions/gate-out');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate]);
};
