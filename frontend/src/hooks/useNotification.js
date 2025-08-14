import { useState } from 'react';

const useNotification = () => {
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  return {
    notification,
    showNotification
  };
};

export default useNotification;