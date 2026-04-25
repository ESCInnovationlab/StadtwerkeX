import { createContext, useContext, useState } from 'react';
import T from '../i18n/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    const [lang, setLang] = useState('en');

    const t = (path) => {
        const keys = path.split('.');
        let node = T[lang];
        for (const k of keys) {
            if (node == null) return path;
            node = node[k];
        }
        return node ?? path;
    };

    const toggleLang = () => setLang(l => l === 'de' ? 'en' : 'de');

    return (
        <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => useContext(LanguageContext);
