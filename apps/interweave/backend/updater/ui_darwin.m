//go:build darwin

// cspell:ignore Scroller fabs

#import <Cocoa/Cocoa.h>
#include <stdint.h>

extern void goUpdaterPanelAction(uint64_t sessionID, char *action);

@interface IWUpdaterPanelController : NSObject <NSWindowDelegate>
@property (nonatomic, strong) NSPanel *panel;
@property (nonatomic, strong) NSImageView *iconView;
@property (nonatomic, strong) NSTextField *titleLabel;
@property (nonatomic, strong) NSTextField *messageLabel;
@property (nonatomic, strong) NSProgressIndicator *progressBar;
@property (nonatomic, strong) NSScrollView *notesScroll;
@property (nonatomic, strong) NSTextView *notesView;
@property (nonatomic, strong) NSButton *primaryButton;
@property (nonatomic, strong) NSButton *secondaryButton;
@property (nonatomic, assign) uint64_t sessionID;
@property (nonatomic, copy) NSString *primaryAction;
@property (nonatomic, copy) NSString *secondaryAction;
@end

static IWUpdaterPanelController *gUpdaterPanelController = nil;

@implementation IWUpdaterPanelController

+ (instancetype)shared {
    if (gUpdaterPanelController == nil) {
        gUpdaterPanelController = [[IWUpdaterPanelController alloc] init];
    }
    return gUpdaterPanelController;
}

- (instancetype)init {
    self = [super init];
    if (!self) {
        return nil;
    }

    NSRect frame = NSMakeRect(0, 0, 460, 148);
    NSWindowStyleMask style = NSWindowStyleMaskTitled | NSWindowStyleMaskClosable;
    NSPanel *panel = [[NSPanel alloc] initWithContentRect:frame
                                                styleMask:style
                                                  backing:NSBackingStoreBuffered
                                                    defer:NO];
    panel.title = @"软件更新";
    panel.hidesOnDeactivate = NO;
    panel.releasedWhenClosed = NO;
    panel.level = NSFloatingWindowLevel;
    panel.delegate = self;
    [panel center];

    NSView *content = panel.contentView;

    NSImageView *icon = [[NSImageView alloc] initWithFrame:NSMakeRect(20, 62, 64, 64)];
    icon.imageScaling = NSImageScaleProportionallyUpOrDown;
    icon.image = [NSApp applicationIconImage];
    [content addSubview:icon];

    NSTextField *title = [NSTextField labelWithString:@""];
    title.font = [NSFont boldSystemFontOfSize:14];
    title.lineBreakMode = NSLineBreakByTruncatingTail;
    title.frame = NSMakeRect(100, 102, 340, 22);
    [content addSubview:title];

    NSTextField *msg = [NSTextField wrappingLabelWithString:@""];
    msg.font = [NSFont systemFontOfSize:12];
    msg.textColor = [NSColor secondaryLabelColor];
    msg.frame = NSMakeRect(100, 76, 340, 22);
    [content addSubview:msg];

    NSProgressIndicator *bar = [[NSProgressIndicator alloc] initWithFrame:NSMakeRect(100, 62, 340, 16)];
    bar.style = NSProgressIndicatorStyleBar;
    bar.minValue = 0;
    bar.maxValue = 100;
    bar.displayedWhenStopped = YES;
    [content addSubview:bar];

    NSScrollView *scroll = [[NSScrollView alloc] initWithFrame:NSMakeRect(100, 56, 340, 140)];
    scroll.hasVerticalScroller = YES;
    scroll.borderType = NSBezelBorder;
    scroll.hidden = YES;

    NSTextView *tv = [[NSTextView alloc] initWithFrame:NSMakeRect(0, 0, 324, 140)];
    tv.editable = NO;
    tv.selectable = YES;
    tv.font = [NSFont systemFontOfSize:12];
    tv.textContainerInset = NSMakeSize(6, 6);
    scroll.documentView = tv;
    [content addSubview:scroll];

    NSButton *primary = [NSButton buttonWithTitle:@"取消" target:self action:@selector(onPrimaryClick:)];
    primary.keyEquivalent = @"\r";
    primary.frame = NSMakeRect(344, 14, 96, 30);
    [content addSubview:primary];

    NSButton *secondary = [NSButton buttonWithTitle:@"稍后" target:self action:@selector(onSecondaryClick:)];
    secondary.frame = NSMakeRect(236, 14, 96, 30);
    secondary.hidden = YES;
    [content addSubview:secondary];

    self.panel = panel;
    self.iconView = icon;
    self.titleLabel = title;
    self.messageLabel = msg;
    self.progressBar = bar;
    self.notesScroll = scroll;
    self.notesView = tv;
    self.primaryButton = primary;
    self.secondaryButton = secondary;
    return self;
}

- (void)emitAction:(NSString *)action {
    if (action.length == 0) {
        return;
    }
    uint64_t sid = self.sessionID;
    const char *utf8 = action.UTF8String;
    if (utf8 != NULL) {
        goUpdaterPanelAction(sid, (char *)utf8);
    }
}

- (void)onPrimaryClick:(id)sender {
    (void)sender;
    [self emitAction:self.primaryAction];
}

- (void)onSecondaryClick:(id)sender {
    (void)sender;
    [self emitAction:self.secondaryAction];
}

- (BOOL)windowShouldClose:(NSWindow *)sender {
    [sender orderOut:nil];
    [self emitAction:@"cancel"];
    return NO;
}

- (void)applyState:(NSString *)state
         sessionID:(uint64_t)sessionID
             title:(NSString *)title
           message:(NSString *)message
             notes:(NSString *)notes
   progressPercent:(int)progressPercent
     indeterminate:(BOOL)indeterminate
  canOpenDownloads:(BOOL)canOpenDownloads {
    self.sessionID = sessionID;
    self.iconView.image = [NSApp applicationIconImage];
    self.titleLabel.stringValue = title ?: @"";
    self.messageLabel.stringValue = message ?: @"";

    BOOL showProgress = [state isEqualToString:@"checking"] ||
                        [state isEqualToString:@"downloading"] ||
                        [state isEqualToString:@"installing"];
    BOOL showNotes = [state isEqualToString:@"available"] && notes.length > 0;

    CGFloat height = showNotes ? 304.0 : (showProgress ? 148.0 : 156.0);
    NSRect frame = self.panel.frame;
    NSRect targetContent = NSMakeRect(0, 0, 460, height);
    NSRect targetFrame = [self.panel frameRectForContentRect:targetContent];
    targetFrame.origin.x = frame.origin.x;
    targetFrame.origin.y = frame.origin.y + (frame.size.height - targetFrame.size.height);
    if (fabs(frame.size.height - targetFrame.size.height) > 1.0) {
        [self.panel setFrame:targetFrame display:YES animate:NO];
    }

    self.iconView.frame = NSMakeRect(20, height - 86, 64, 64);
    self.titleLabel.frame = NSMakeRect(100, height - 44, 340, 22);

    if (showProgress) {
        self.messageLabel.frame = NSMakeRect(100, height - 68, 340, 20);
        self.progressBar.frame = NSMakeRect(100, height - 92, 340, 16);
        self.progressBar.hidden = NO;
        self.notesScroll.hidden = YES;
        self.progressBar.indeterminate = indeterminate;
        if (indeterminate) {
            [self.progressBar startAnimation:nil];
        } else {
            [self.progressBar stopAnimation:nil];
            self.progressBar.doubleValue = (double)progressPercent;
        }
    } else if (showNotes) {
        self.messageLabel.frame = NSMakeRect(100, height - 72, 340, 24);
        self.progressBar.hidden = YES;
        [self.progressBar stopAnimation:nil];
        self.notesScroll.frame = NSMakeRect(100, 56, 340, height - 138);
        self.notesScroll.hidden = NO;
        self.notesView.string = notes ?: @"";
    } else {
        self.messageLabel.frame = NSMakeRect(100, 56, 340, height - 104);
        self.progressBar.hidden = YES;
        [self.progressBar stopAnimation:nil];
        self.notesScroll.hidden = YES;
    }

    self.secondaryButton.hidden = YES;
    self.secondaryAction = nil;
    self.primaryButton.hidden = NO;

    if ([state isEqualToString:@"checking"] || [state isEqualToString:@"downloading"] || [state isEqualToString:@"installing"]) {
        self.primaryButton.title = @"取消";
        self.primaryAction = @"cancel";
        self.primaryButton.frame = NSMakeRect(344, 14, 96, 30);
    } else if ([state isEqualToString:@"up-to-date"]) {
        self.primaryButton.title = @"好";
        self.primaryAction = @"close";
        self.primaryButton.frame = NSMakeRect(344, 14, 96, 30);
    } else if ([state isEqualToString:@"available"]) {
        self.primaryButton.title = @"安装更新";
        self.primaryAction = @"install-update";
        self.primaryButton.frame = NSMakeRect(336, 14, 104, 30);
        self.secondaryButton.title = @"稍后";
        self.secondaryAction = @"later";
        self.secondaryButton.frame = NSMakeRect(228, 14, 96, 30);
        self.secondaryButton.hidden = NO;
    } else if ([state isEqualToString:@"ready-to-install"]) {
        self.primaryButton.title = @"安装并重启";
        self.primaryAction = @"restart-and-install";
        self.primaryButton.frame = NSMakeRect(328, 14, 112, 30);
        self.secondaryButton.title = @"稍后";
        self.secondaryAction = @"later";
        self.secondaryButton.frame = NSMakeRect(220, 14, 96, 30);
        self.secondaryButton.hidden = NO;
    } else {
        self.primaryButton.title = @"关闭";
        self.primaryAction = @"close";
        self.primaryButton.frame = NSMakeRect(344, 14, 96, 30);
        if (canOpenDownloads) {
            self.secondaryButton.title = @"打开下载页";
            self.secondaryAction = @"open-releases";
            self.secondaryButton.frame = NSMakeRect(224, 14, 108, 30);
            self.secondaryButton.hidden = NO;
        }
    }

    [self.panel orderFrontRegardless];
    [NSApp activateIgnoringOtherApps:YES];
}

@end

void iw_updater_panel_render(
    uint64_t sessionID,
    const char *state,
    const char *title,
    const char *message,
    const char *notes,
    int progressPercent,
    int indeterminate,
    int canOpenDownloads
) {
    NSString *nsState = state ? [NSString stringWithUTF8String:state] : @"";
    NSString *nsTitle = title ? [NSString stringWithUTF8String:title] : @"";
    NSString *nsMsg = message ? [NSString stringWithUTF8String:message] : @"";
    NSString *nsNotes = notes ? [NSString stringWithUTF8String:notes] : @"";
    dispatch_async(dispatch_get_main_queue(), ^{
        [[IWUpdaterPanelController shared] applyState:nsState
                                            sessionID:sessionID
                                                title:nsTitle
                                              message:nsMsg
                                                notes:nsNotes
                                      progressPercent:progressPercent
                                        indeterminate:(indeterminate != 0)
                                     canOpenDownloads:(canOpenDownloads != 0)];
    });
}

void iw_updater_panel_focus(void) {
    dispatch_async(dispatch_get_main_queue(), ^{
        IWUpdaterPanelController *ctrl = [IWUpdaterPanelController shared];
        [ctrl.panel orderFrontRegardless];
        [NSApp activateIgnoringOtherApps:YES];
    });
}

void iw_updater_panel_hide(void) {
    dispatch_async(dispatch_get_main_queue(), ^{
        if (gUpdaterPanelController != nil) {
            [gUpdaterPanelController.progressBar stopAnimation:nil];
            [gUpdaterPanelController.panel orderOut:nil];
        }
    });
}
