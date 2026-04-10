export default function AvatarDisplay({ avatar, className }) {
  if (!avatar) return <span className={className}>😀</span>;
  
  const isImage = typeof avatar === 'string' && avatar.includes('/avatars/');
  
  if (isImage) {
    return (
      <img 
        src={avatar} 
        alt="Avatar" 
        className={className} 
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', minWidth: 0, minHeight: 0 }} 
      />
    );
  }
  
  return <span className={className}>{avatar}</span>;
}
