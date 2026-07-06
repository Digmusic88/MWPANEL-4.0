import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import InstagramFeed from '../../components/blog/InstagramFeed';
import BlogTimeline from '../../components/blog/BlogTimeline';
import { useResponsive } from '../../hooks/useResponsive';
import '../../styles/instagram-blog.css';
import './InstagramBlogPage.css';

interface BlogPost {
  id: string;
  title: string;
  publishDate?: string;
  createdAt: string;
}

const InstagramBlogPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [activePostId, setActivePostId] = useState<string | undefined>();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isScrollingFromClick = useRef(false);
  const { isDesktop } = useResponsive(); // Hook para detectar desktop (>= 1024px)

  // Update active post based on URL hash
  useEffect(() => {
    if (location.hash) {
      const postId = location.hash.replace('#post-', '');
      setActivePostId(postId);
    }
  }, [location.hash]);

  // Setup Intersection Observer for scrollspy
  useEffect(() => {
    if (posts.length === 0) return;

    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer - triggers when post is in the center of viewport
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Skip if we're programmatically scrolling from timeline click
        if (isScrollingFromClick.current) return;

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const postId = entry.target.id.replace('post-', '');
            setActivePostId(postId);
          }
        });
      },
      {
        rootMargin: '-50% 0px -50% 0px', // Trigger when post is in center of viewport
        threshold: 0,
      }
    );

    // Observe all post elements
    posts.forEach((post) => {
      const element = document.getElementById(`post-${post.id}`);
      if (element && observerRef.current) {
        observerRef.current.observe(element);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [posts]);

  const handlePostsLoaded = useCallback((loadedPosts: BlogPost[]) => {
    setPosts(loadedPosts);
    // Set the first post as active if no hash in URL
    if (!location.hash && loadedPosts.length > 0) {
      setActivePostId(loadedPosts[0].id);
    }
  }, [location.hash]);

  const handleTimelinePostClick = useCallback((postId: string) => {
    // Prevent observer from changing active post during programmatic scroll
    isScrollingFromClick.current = true;
    setActivePostId(postId);

    // Navigate to the post with smooth scroll
    navigate(`/blog#post-${postId}`, { replace: true });

    // Scroll to the post element
    setTimeout(() => {
      const element = document.getElementById(`post-${postId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // Re-enable observer after scroll animation completes
      setTimeout(() => {
        isScrollingFromClick.current = false;
      }, 1000);
    }, 50);
  }, [navigate]);

  return (
    <DashboardLayout>
      <div className="blog-page-container">
        <div className="blog-page-header">
          <h1 className="blog-page-title">Blog del Centro</h1>
          <p className="blog-page-subtitle">
            Publicaciones y novedades de la comunidad educativa
          </p>
        </div>

        {/* Mobile Timeline - positioned after header, becomes sticky on scroll */}
        {/* Solo renderizar en mobile/tablet, NO en desktop */}
        {posts.length > 0 && !isDesktop && (
          <div className="blog-timeline-mobile-container">
            <BlogTimeline
              posts={posts}
              activePostId={activePostId}
              onPostClick={handleTimelinePostClick}
              variant="mobile"
            />
          </div>
        )}

        <div className="blog-page-layout">
          {/* Main Content - Posts Feed */}
          <main className="blog-page-content">
            <InstagramFeed
              onPostsLoaded={handlePostsLoaded}
              activePostId={activePostId}
            />
          </main>

          {/* Desktop Timeline - sidebar (solo en desktop) */}
          {posts.length > 0 && isDesktop && (
            <div className="blog-timeline-desktop-container">
              <BlogTimeline
                posts={posts}
                activePostId={activePostId}
                onPostClick={handleTimelinePostClick}
                variant="desktop"
              />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InstagramBlogPage;
