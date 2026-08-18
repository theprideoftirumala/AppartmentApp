/**
 * Tooltip / Info Bubble component
 * Usage: <InfoBubble text="Explanation here" />
 */

import { useState } from 'react';
import { Info } from 'lucide-react';

export function InfoBubble({ text, position = 'top' }) {
    const [visible, setVisible] = useState(false);

    return (
        <span
            className="info-bubble-wrap"
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
            onFocus={() => setVisible(true)}
            onBlur={() => setVisible(false)}
            tabIndex={0}
            aria-label={text}
        >
            <Info size={14} className="info-bubble-icon" />
            {visible && (
                <div className={`info-bubble-tip info-bubble-${position}`} role="tooltip">
                    {text}
                </div>
            )}
        </span>
    );
}

export default InfoBubble;
