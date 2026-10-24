import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { http } from '../api/http.js';

const ContactsContext = createContext(null);

// REQ-PRO-4: the user's contact list, shared by the sidebar, chats and groups.
export function ContactsProvider({ children }) {
  const [contacts, setContacts] = useState([]);

  const refresh = useCallback(async () => {
    const { data } = await http.get('/contacts');
    setContacts(data);
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const addContact = useCallback(async (user) => {
    const { data } = await http.post('/contacts', { contactUserId: user.id });
    setContacts((prev) => [...prev.filter((c) => c.id !== data.id), data]);
  }, []);

  const removeContact = useCallback(async (user) => {
    await http.delete(`/contacts/${user.id}`);
    setContacts((prev) => prev.filter((c) => c.id !== user.id));
  }, []);

  const value = useMemo(
    () => ({ contacts, refresh, addContact, removeContact, isContact: (id) => contacts.some((c) => c.id === id) }),
    [contacts, refresh, addContact, removeContact]
  );
  return <ContactsContext.Provider value={value}>{children}</ContactsContext.Provider>;
}

export function useContacts() {
  const ctx = useContext(ContactsContext);
  if (!ctx) throw new Error('useContacts must be used inside ContactsProvider');
  return ctx;
}
