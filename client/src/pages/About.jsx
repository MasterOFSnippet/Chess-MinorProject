import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Gamepad2, Shield, Zap, Trophy, Bot, TrendingUp, Github, Linkedin, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; 
import FeedbackBox from '../components/common/FeedbackBox'; 

const About = () => {
  const { user } = useAuth();

  const contributors = [
    {
      name: 'Arav Gautam',
      role: 'Full-Stack Developer',
      bio: 'Led architecture design, Backend API, Socket.IO integration, and AI bot implementation',
      contributions: ['Server Architecture', 'REST API', 'Socket.IO', 'Stockfish AI', 'ELO System'],
      github: 'https://github.com/MasterOFSnippet',
      linkedin: 'https://www.linkedin.com/in/arav-gautam-007swerty2024',
      email: 'working.aravgautam@gmail.com'
    },
    {
      name: 'Gaurav Mishra',
      role: 'Full-Stack Developer',
      bio: 'Frontend UI/UX, React components, Game logic, and real-time chat implementation',
      contributions: ['Frontend Design', 'React Components', 'Game.jsx', 'Chat System', 'Tailwind CSS'],
      github: 'https://github.com/iamgauravmisra',
      linkedin: 'https://www.linkedin.com/in/gaurav-mishra-8aa936288',
      email: 'iamgauravmisra@gmail.com'
    }
  ];

  return (
    <div className="min-h-screen py-12 px-4 text-[hsl(var(--color-foreground))] bg-[hsl(var(--color-background))]">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-bold text-[hsl(var(--color-primary))]">♟️ ChessMaster</h1>
          <p className="text-xl text-[hsl(var(--color-muted-foreground))]">
            A professional online chess platform built with the MERN stack
          </p>

          <div className="flex gap-2 justify-center flex-wrap">
            <Badge>MongoDB</Badge>
            <Badge>Express</Badge>
            <Badge>React</Badge>
            <Badge>Node.js</Badge>
            <Badge>Stockfish</Badge>
            <Badge>ELO Rating</Badge>
          </div>
        </div>

        {/* Main Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>About the Platform</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-[hsl(var(--color-muted-foreground))]">
            <p>
              ChessMaster is a professional-grade online chess platform that allows players
              to compete against each other or challenge an AI opponent powered by Stockfish.
              Built with modern web technologies, it provides a seamless and enjoyable chess
              experience with real-time move validation and ELO rating system.
            </p>
            <p>
              Whether you're a beginner learning the game or a seasoned player looking for
              challenging opponents, ChessMaster offers features that cater to all skill levels.
              Test your skills against other players or practice against our intelligent AI that
              adapts to your rating level.
            </p>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { icon: Gamepad2, title: "Play Online", desc: "Challenge players worldwide in real-time matches with instant move validation and automatic game state management." },
            { icon: Bot, title: "AI Opponent", desc: "Practice against Stockfish engine that adjusts difficulty based on your rating. Perfect for improving your skills." },
            { icon: TrendingUp, title: "ELO Rating System", desc: "Track your progress with our accurate ELO rating system. Watch your rating climb as you improve and win matches." },
            { icon: Zap, title: "Valid Moves Only", desc: "Powered by chess.js library, ensuring all moves follow official chess rules with automatic checkmate detection." },
            { icon: Shield, title: "Secure & Private", desc: "Your account is protected with industry-standard JWT authentication and encrypted passwords." },
            { icon: Trophy, title: "Track Progress", desc: "Monitor your rating, wins, losses, and complete game history. Analyze your games and improve your strategy." },
          ].map(({ icon: Icon, title, desc }, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-[hsl(var(--color-primary)/0.1)] hover:bg-[hsl(var(--color-primary)/0.15)] transition-colors">
                    <Icon className="h-8 w-8 text-[hsl(var(--color-primary))]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2 text-[hsl(var(--color-foreground))]">{title}</h3>
                    <p className="text-sm text-[hsl(var(--color-muted-foreground))]">{desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Technology Stack */}
        <Card>
          <CardHeader>
            <CardTitle>Technology Stack</CardTitle>
            <CardDescription>Built with modern, production-ready technologies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-[hsl(var(--color-primary))]">Frontend</h3>
                <ul className="space-y-2">
                  {[
                    'React 19 with Hooks',
                    'Vite for blazing-fast builds',
                    'Tailwind CSS v4',
                    'shadcn/ui components',
                    'React Router v6',
                    'chess.js for game logic',
                    'Socket.IO for real-time chat'
                  ].map((tech, i) => (
                    <li key={i} className="flex items-center text-sm text-[hsl(var(--color-muted-foreground))]">
                      <span className="mr-2 text-[hsl(var(--color-primary))]">▹</span>
                      {tech}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 text-[hsl(var(--color-primary))]">Backend</h3>
                <ul className="space-y-2">
                  {[
                    'Node.js & Express.js',
                    'MongoDB with Mongoose',
                    'JWT Authentication',
                    'Socket.IO for real-time',
                    'Stockfish Chess Engine',
                    'ELO Rating Algorithm',
                    'bcrypt for security'
                  ].map((tech, i) => (
                    <li key={i} className="flex items-center text-sm text-[hsl(var(--color-muted-foreground))]">
                      <span className="mr-2 text-[hsl(var(--color-primary))]">▹</span>
                      {tech}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contributors Section */}
        <Card>
          <CardHeader>
            <CardTitle>Meet the Team</CardTitle>
            <CardDescription>Passionate developers building the future of online chess</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {contributors.map((contributor, i) => (
                <div 
                  key={i}
                  className="p-6 rounded-lg border border-[hsl(var(--color-border))] bg-[hsl(var(--color-card)/0.5)] hover:bg-[hsl(var(--color-card)/0.8)] transition-all hover:shadow-lg"
                >
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-[hsl(var(--color-foreground))] mb-1">
                      {contributor.name}
                    </h3>
                    <p className="text-sm text-[hsl(var(--color-primary))] font-semibold">
                      {contributor.role}
                    </p>
                  </div>

                  <p className="text-sm text-[hsl(var(--color-muted-foreground))] mb-4">
                    {contributor.bio}
                  </p>

                  <div className="mb-4">
                    <p className="text-xs font-semibold text-[hsl(var(--color-muted-foreground))] mb-2 uppercase">
                      Key Contributions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {contributor.contributions.map((contrib, j) => (
                        <Badge key={j} variant="secondary" className="text-xs">
                          {contrib}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-[hsl(var(--color-border))]">
                    <a 
                      href={contributor.github} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[hsl(var(--color-muted-foreground))] hover:text-[hsl(var(--color-primary))] transition-colors"
                      title="GitHub"
                    >
                      <Github className="h-5 w-5" />
                    </a>
                    <a 
                      href={contributor.linkedin} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[hsl(var(--color-muted-foreground))] hover:text-[hsl(var(--color-primary))] transition-colors"
                      title="LinkedIn"
                    >
                      <Linkedin className="h-5 w-5" />
                    </a>
                    <a 
                      href={`mailto:${contributor.email}`}
                      className="text-[hsl(var(--color-muted-foreground))] hover:text-[hsl(var(--color-primary))] transition-colors"
                      title="Email"
                    >
                      <Mail className="h-5 w-5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 rounded-lg bg-[hsl(var(--color-primary)/0.1)] border border-[hsl(var(--color-primary)/0.2)]">
              <div className="flex items-center gap-3">
                <Github className="h-5 w-5 text-[hsl(var(--color-primary))]" />
                <div>
                  <p className="font-semibold text-sm text-[hsl(var(--color-foreground))]">
                    Open Source on GitHub
                  </p>
                  <p className="text-xs text-[hsl(var(--color-muted-foreground))]">
                    View the source code and contribute:
                  </p>
                  <a 
                    href="https://github.com/MasterOFSnippet/Chess-MinorProject" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[hsl(var(--color-primary))] hover:underline text-sm font-medium"
                  >
                    github.com/MasterOFSnippet/Chess-MinorProject →
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ✅ FEEDBACK BOX - NEW SECTION */}
        <FeedbackBox user={user} />

        {/* Footer */}
        <div className="text-center space-y-2 text-[hsl(var(--color-muted-foreground))]">
          <p className="text-sm">Built with ❤️ using MERN Stack</p>
          <p className="text-xs opacity-80">© 2025 ChessMaster. All rights reserved. | MIT License</p>
        </div>

      </div>
    </div>
  );
};

export default About;