# ADR-0013: Interweave 领域模型——可寻址资源与内部索引引用

Interweave 的库以「条目（Item）」为唯一中心实体：条目是可寻址资源（v1 为 `file` 与 `url` 两种 kind），拥有稳定 UUID、定位符（locator）、指纹（fingerprint）和标签集合，不依赖文件树。App 对源文件采用**内部索引引用**而非 OS 级符号链接：只在本地 SQLite（`modernc.org/sqlite`，存放于 xdg 数据目录）记录路径与元数据，源文件保持原位、绝不复制或改动；这样避免了 Windows 创建链接的权限问题，也让修复、多级标签与 MCP 都作用于注册表而非文件系统。
