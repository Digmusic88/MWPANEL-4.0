import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { ClockCircleOutlined, DownOutlined } from '@ant-design/icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import './BlogTimeline.css';

interface BlogPost {
  id: string;
  title: string;
  publishDate?: string;
  createdAt: string;
}

interface BlogTimelineProps {
  posts: BlogPost[];
  activePostId?: string;
  onPostClick: (postId: string) => void;
  variant?: 'mobile' | 'desktop'; // Which variant to render
}

interface YearGroup {
  year: number;
  posts: BlogPost[];
}

const BlogTimeline: React.FC<BlogTimelineProps> = ({
  posts,
  activePostId,
  onPostClick,
  variant = 'mobile', // Default to mobile if not specified
}) => {
  const activeItemRef = useRef<HTMLLIElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [mobileIsSticky, setMobileIsSticky] = useState(false);
  const [desktopPosition, setDesktopPosition] = useState<{ top: number; right: number } | null>(null);
  const isInitialLoad = useRef(true);

  const isMobile = variant === 'mobile';

  // Desktop: Calculate fixed position based on our wrapper's position
  useEffect(() => {
    if (isMobile) {
      setDesktopPosition(null);
      return;
    }

    const calculatePosition = () => {
      // Use wrapperRef to calculate where the timeline should be positioned
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        // Calculate right position: distance from right edge of viewport to right edge of element
        const rightDistance = window.innerWidth - rect.right;
        setDesktopPosition({
          top: 100, // Fixed distance from top of viewport
          right: Math.max(rightDistance, 20), // Minimum 20px from right edge
        });
      } else {
        // Fallback: try to find the container by class
        const container = document.querySelector('.blog-timeline-desktop-container');
        if (container) {
          const rect = container.getBoundingClientRect();
          const rightDistance = window.innerWidth - rect.right;
          setDesktopPosition({
            top: 100,
            right: Math.max(rightDistance, 20),
          });
        }
      }
    };

    // Calculate immediately and after delays to ensure layout is complete
    calculatePosition();
    const timer1 = setTimeout(calculatePosition, 100);
    const timer2 = setTimeout(calculatePosition, 500);

    // Recalculate on resize
    window.addEventListener('resize', calculatePosition);

    // Also recalculate when scrollable container scrolls (for horizontal position)
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', calculatePosition, { passive: true });
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', calculatePosition);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', calculatePosition);
      }
    };
  }, [isMobile]);

  // Mobile: Detect when header scrolls out of view
  useEffect(() => {
    if (!isMobile) {
      setMobileIsSticky(false);
      return;
    }

    const blogHeader = document.querySelector('.blog-page-header') as HTMLElement;
    if (!blogHeader) return;

    // Find the scrollable container - DashboardLayout uses overflow-y-auto
    const scrollContainer = document.querySelector('.overflow-y-auto') as HTMLElement;

    let lastIsSticky = false;

    const handleScroll = () => {
      const headerRect = blogHeader.getBoundingClientRect();
      // Trigger sticky when header bottom goes above viewport top
      const shouldBeSticky = headerRect.bottom <= 0;

      if (shouldBeSticky !== lastIsSticky) {
        lastIsSticky = shouldBeSticky;
        setMobileIsSticky(shouldBeSticky);
      }
    };

    // Listen on the scroll container (not window) since content is inside it
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    }

    // Also listen on window as fallback
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Initial check after a short delay
    setTimeout(handleScroll, 100);

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isMobile]);

  // Determine which year the active post belongs to
  const getPostYear = useCallback((postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      return new Date(post.publishDate || post.createdAt).getFullYear();
    }
    return null;
  }, [posts]);

  // Auto-expand the year containing the active post
  useEffect(() => {
    if (activePostId) {
      const activeYear = getPostYear(activePostId);
      if (activeYear && !expandedYears.has(activeYear)) {
        setExpandedYears(prev => new Set([...prev, activeYear]));
      }
    }
  }, [activePostId, getPostYear, expandedYears]);

  // Initialize with current year expanded
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    setExpandedYears(new Set([currentYear]));
  }, []);

  // Scroll active item into view (only after initial load, only horizontal for mobile)
  useEffect(() => {
    if (isInitialLoad.current) {
      const timer = setTimeout(() => {
        isInitialLoad.current = false;
      }, 500);
      return () => clearTimeout(timer);
    }

    if (activeItemRef.current && isMobile && timelineScrollRef.current) {
      const container = timelineScrollRef.current.querySelector('.blog-timeline');
      if (container) {
        const scrollAmount = activeItemRef.current.offsetLeft -
          (container.clientWidth / 2) +
          (activeItemRef.current.clientWidth / 2);
        container.scrollTo({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  }, [activePostId, isMobile]);

  // Toggle year expansion
  const toggleYear = useCallback((year: number) => {
    setExpandedYears(prev => {
      const newSet = new Set(prev);
      if (newSet.has(year)) {
        newSet.delete(year);
      } else {
        newSet.add(year);
      }
      return newSet;
    });
  }, []);

  // Group posts by year
  const groupedPosts = useMemo(() => {
    const groups: Map<number, BlogPost[]> = new Map();

    posts.forEach((post) => {
      const date = new Date(post.publishDate || post.createdAt);
      const year = date.getFullYear();

      if (!groups.has(year)) {
        groups.set(year, []);
      }
      groups.get(year)!.push(post);
    });

    const result: YearGroup[] = [];
    groups.forEach((yearPosts, year) => {
      result.push({
        year,
        posts: yearPosts.sort((a, b) => {
          const dateA = new Date(a.publishDate || a.createdAt);
          const dateB = new Date(b.publishDate || b.createdAt);
          return dateB.getTime() - dateA.getTime();
        }),
      });
    });

    return result.sort((a, b) => b.year - a.year);
  }, [posts]);

  const formatPostDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'MMM d', { locale: es });
  };

  const handlePostClick = (e: React.MouseEvent, postId: string) => {
    e.preventDefault();
    onPostClick(postId);
  };

  const handleYearClick = (e: React.MouseEvent, year: number) => {
    e.stopPropagation();
    if (!isMobile) {
      toggleYear(year);
    }
  };

  const activePostTitle = useMemo(() => {
    if (!activePostId) return 'Selecciona un post';
    const activePost = posts.find(p => p.id === activePostId);
    return activePost?.title || 'Selecciona un post';
  }, [activePostId, posts]);

  if (posts.length === 0) {
    return null;
  }

  // Timeline content
  const timelineContent = (
    <>
      {/* Mobile Header */}
      <div className="blog-timeline-mobile-header">
        <div className="blog-timeline-current-view">
          <span className="blog-timeline-current-label">Viendo ahora</span>
          <span className="blog-timeline-current-text">{activePostTitle}</span>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="blog-timeline-header">
        <div className="blog-timeline-header-left">
          <ClockCircleOutlined />
          <span>Historial</span>
        </div>
      </div>

      {/* Timeline items */}
      <div className="blog-timeline-scroll-container" ref={timelineScrollRef}>
        <div className="blog-timeline">
          {groupedPosts.map((group) => {
            const isExpanded = expandedYears.has(group.year);
            const hasActivePost = group.posts.some(p => p.id === activePostId);

            return (
              <div
                key={group.year}
                className={`blog-timeline-year-group ${isExpanded ? 'expanded' : 'collapsed'} ${hasActivePost ? 'has-active' : ''}`}
              >
                <div
                  className="blog-timeline-year-label"
                  onClick={(e) => handleYearClick(e, group.year)}
                >
                  <span className="blog-timeline-year-text">{group.year}</span>
                  <span className="blog-timeline-year-count">({group.posts.length})</span>
                  <DownOutlined className={`blog-timeline-year-chevron ${isExpanded ? 'rotated' : ''}`} />
                </div>
                <ul className={`blog-timeline-posts ${isExpanded ? 'expanded' : 'collapsed'}`}>
                  {group.posts.map((post) => {
                    const isActive = activePostId === post.id;
                    return (
                      <li
                        key={post.id}
                        ref={isActive ? activeItemRef : null}
                        className={`blog-timeline-post ${isActive ? 'active' : ''}`}
                        onClick={(e) => handlePostClick(e, post.id)}
                      >
                        <span
                          className="blog-timeline-post-dot"
                          style={{
                            position: 'absolute',
                            left: isActive ? '-24px' : '-22px',
                            top: isActive ? '6px' : '8px',
                            width: isActive ? '10px' : '6px',
                            height: isActive ? '10px' : '6px',
                            backgroundColor: '#579172',
                            borderRadius: '50%',
                            display: 'block',
                            boxShadow: isActive ? '0 0 0 4px rgba(87, 145, 114, 0.3)' : 'none',
                            animation: isActive ? 'activePulse 2s ease-in-out infinite' : 'none',
                          }}
                        />
                        <a href={`#post-${post.id}`}>
                          <span className="blog-timeline-post-date">
                            {formatPostDate(post.publishDate || post.createdAt)}
                          </span>
                          <span className="blog-timeline-post-title">{post.title}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );

  // Mobile: Render normally or as fixed via portal
  if (isMobile) {
    if (mobileIsSticky) {
      // When sticky, render fixed at top using portal to escape overflow containers
      return (
        <>
          {/* Placeholder to maintain layout space */}
          <div ref={wrapperRef} style={{ height: 100 }} />
          {ReactDOM.createPortal(
            <aside
              className="blog-timeline-wrapper blog-timeline-mobile is-sticky"
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                width: '100%',
                zIndex: 9999,
                background: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                borderRadius: 0,
                margin: 0,
              }}
            >
              {timelineContent}
            </aside>,
            document.body
          )}
        </>
      );
    }

    // Normal mobile rendering (not sticky)
    return (
      <aside ref={wrapperRef} className="blog-timeline-wrapper blog-timeline-mobile">
        {timelineContent}
      </aside>
    );
  }

  // Desktop: Always render fixed using portal for sticky behavior
  // First render a hidden placeholder to get position, then render fixed via portal
  return (
    <>
      {/* Hidden placeholder to calculate position */}
      <div ref={wrapperRef} style={{ width: 260, height: 1 }} />
      {desktopPosition && ReactDOM.createPortal(
        <aside
          className="blog-timeline-wrapper blog-timeline-desktop"
          style={{
            position: 'fixed',
            top: desktopPosition.top,
            right: desktopPosition.right,
            width: 260,
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
            background: 'white',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '1rem',
            zIndex: 100,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}
        >
          {timelineContent}
        </aside>,
        document.body
      )}
    </>
  );
};

export default BlogTimeline;
