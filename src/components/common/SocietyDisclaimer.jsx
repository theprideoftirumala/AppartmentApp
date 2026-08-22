import { SOCIETY_DISCLAIMER } from '../../config/constants';

export default function SocietyDisclaimer({ compact = false }) {
  return (
    <p className={`society-disclaimer ${compact ? 'society-disclaimer-compact' : ''}`}>
      {SOCIETY_DISCLAIMER}
    </p>
  );
}
