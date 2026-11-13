import { NavLink } from 'react-router-dom';
import { EXPLORE, SUPPORT, type NavItem } from './navItems';

function Item({ item }: { item: NavItem }) {
  const tone = item.tone ? ` nt-${item.tone}` : '';
  const body = (
    <>
      <span className="side-label">{item.icon} {item.label}</span>
      {item.isNew && <span className="pill-new">New</span>}
      {item.count !== undefined && <span className="count">{item.count}</span>}
    </>
  );
  if (item.to) {
    return (
      <li>
        <NavLink to={item.to} end={item.to === '/'} className={({ isActive }) => `side-item${tone}${isActive ? ' active' : ''}`}>
          {body}
        </NavLink>
      </li>
    );
  }
  // Roadmap feature we have not built: same slot, visibly disabled, not a link.
  return (
    <li>
      <div className={`side-item is-soon${tone}`} aria-disabled="true" title="Coming soon">
        <span className="side-label">{item.icon} {item.label}</span>
        <span className="pills">
          {item.isNew && <span className="pill-new">New</span>}
          <span className="pill-soon">Soon</span>
        </span>
      </div>
    </li>
  );
}

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  return (
    <nav
      id="shell-sidebar" className={`side${open ? ' open' : ''}`} aria-label="Site sections"
      onClick={(e) => (e.target as HTMLElement).closest('a') && onNavigate()}
    >
      <div className="section-label">Explore</div>
      <ul>{EXPLORE.map((i) => <Item key={i.id} item={i} />)}</ul>
      <div className="section-label">Support</div>
      <ul>{SUPPORT.map((i) => <Item key={i.id} item={i} />)}</ul>
    </nav>
  );
}
